"""
非遗美食复原推理引擎
输入古籍片段/古画描述 → 解析线索 → 查询知识图谱 → 推理复原

集成LLM多步推理（豆包API），LLM不可用时自动回退到关键词匹配。
"""
import re
import json
import os
import time
from typing import Dict, List, Optional, Any
from .knowledge_graph import get_knowledge_graph, KnowledgeGraph
from .llm_reasoner import LLMReasoner, get_llm_reasoner


class RestorationEngine:
    """复原推理引擎（LLM增强版）"""

    def __init__(self, kg: KnowledgeGraph = None, llm: LLMReasoner = None):
        self.kg = kg or get_knowledge_graph()
        self.llm = llm or get_llm_reasoner()
        # 关键词索引（LLM不可用时的fallback）
        self._dish_keywords: Dict[str, List[str]] = {}
        self._ingredient_keywords: Dict[str, List[str]] = {}
        self._authority_texts: Optional[List[Dict[str, Any]]] = None
        self._build_keyword_index()

    def _build_keyword_index(self):
        """构建关键词索引用于快速匹配"""
        # 菜品关键词
        for dish in self.kg.get_nodes_by_type("dish"):
            keywords = [dish["name"]]
            keywords.extend(dish.get("aliases", []))
            self._dish_keywords[dish["id"]] = keywords

        # 食材关键词
        for ing in self.kg.get_nodes_by_type("ingredient"):
            keywords = [ing["name"]]
            keywords.extend(ing.get("aliases", []))
            self._ingredient_keywords[ing["id"]] = keywords

    def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        分析输入文本，提取线索（LLM增强版）
        输入：古籍片段或古画描述
        输出：识别出的菜品、食材、技法、朝代等线索
        """
        # 尝试LLM推理分析
        llm_analysis = None
        if self.llm.is_available:
            try:
                llm_analysis = self.llm.analyze_text(text)
            except Exception:
                llm_analysis = None

        # Fallback: 关键词匹配（LLM不可用或失败时）
        clues = self._keyword_analyze(text)

        # 如果有LLM分析结果，合并增强
        if llm_analysis:
            clues["llm_enhanced"] = True
            clues["llm_analysis"] = {
                "summary": llm_analysis.get("summary", ""),
                "cultural_context": llm_analysis.get("cultural_context", "")
            }
            # 合并LLM识别出的菜品（补充关键词未匹配到的）
            for dish_info in llm_analysis.get("dishes", []):
                name = dish_info.get("name", "")
                if name and not any(d["name"] == name for d in clues["matched_dishes"]):
                    # 尝试在知识图谱中查找
                    kg_dish = self._find_dish_by_name(name)
                    if kg_dish:
                        clues["matched_dishes"].append({
                            "id": kg_dish["id"],
                            "name": kg_dish["name"],
                            "matched_keyword": name,
                            "confidence": dish_info.get("confidence", 0.5),
                            "source": "llm"
                        })

        return clues

    def _keyword_analyze(self, text: str) -> Dict[str, Any]:
        """关键词匹配分析（Fallback方案）"""
        clues = {
            "matched_dishes": [],
            "matched_ingredients": [],
            "matched_techniques": [],
            "matched_dynasties": [],
            "matched_regions": [],
            "keywords": [],
            "raw_text": text,
            "llm_enhanced": False
        }

        # 匹配菜品
        for dish_id, keywords in self._dish_keywords.items():
            for kw in keywords:
                if kw in text:
                    dish = self.kg.get_node(dish_id)
                    if dish:
                        clues["matched_dishes"].append({
                            "id": dish_id,
                            "name": dish["name"],
                            "matched_keyword": kw,
                            "confidence": 1.0 if len(kw) >= 3 else 0.7
                        })
                    break

        # 匹配食材
        for ing_id, keywords in self._ingredient_keywords.items():
            for kw in keywords:
                if kw in text:
                    ing = self.kg.get_node(ing_id)
                    if ing:
                        clues["matched_ingredients"].append({
                            "id": ing_id,
                            "name": ing["name"],
                            "matched_keyword": kw
                        })
                    break

        # 匹配技法
        for tech in self.kg.get_nodes_by_type("technique"):
            if tech["name"] in text:
                clues["matched_techniques"].append({
                    "id": tech["id"],
                    "name": tech["name"]
                })

        # 匹配朝代
        dynasty_keywords = {
            "唐": "dynasty_003", "宋": "dynasty_004",
            "元": "dynasty_005", "明": "dynasty_006",
            "清": "dynasty_007", "汉": "dynasty_002",
            "先秦": "dynasty_001"
        }
        for kw, dyn_id in dynasty_keywords.items():
            if kw in text:
                dyn = self.kg.get_node(dyn_id)
                if dyn:
                    clues["matched_dynasties"].append({
                        "id": dyn_id,
                        "name": dyn["name"]
                    })

        # 匹配地域
        for region in self.kg.get_nodes_by_type("region"):
            if region["name"] in text:
                clues["matched_regions"].append({
                    "id": region["id"],
                    "name": region["name"]
                })

        return clues

    def _find_dish_by_name(self, name: str) -> Optional[Dict]:
        """在知识图谱中按名称查找菜品"""
        for dish in self.kg.get_nodes_by_type("dish"):
            if dish["name"] == name or name in dish.get("aliases", []):
                return dish
        return None

    def _build_context(self, dish_info: Dict[str, Any]) -> Dict[str, Any]:
        """构建知识图谱上下文，供LLM推理使用"""
        context = {
            "dish_name": dish_info.get("name", ""),
            "dynasty": dish_info.get("dynasty", {}).get("name", "") if isinstance(dish_info.get("dynasty"), dict) else "",
            "description": dish_info.get("description", ""),
            "source_passage": dish_info.get("source_passage", ""),
            "ingredients": [],
            "techniques": [],
            "regions": [],
            "related_dishes": []
        }

        # 食材信息
        for ing in dish_info.get("ingredients", []):
            context["ingredients"].append({
                "name": ing.get("name", ""),
                "role": ing.get("role", ""),
                "is_extinct": ing.get("is_extinct", False),
                "modern_substitute": ing.get("modern_substitute", "")
            })

        # 技法信息
        for tech in dish_info.get("techniques", []):
            if isinstance(tech, dict):
                context["techniques"].append({
                    "name": tech.get("name", ""),
                    "description": tech.get("description", ""),
                    "step_order": tech.get("step_order", 0)
                })
            else:
                context["techniques"].append({"name": str(tech)})

        # 地域信息
        for region in dish_info.get("regions", []):
            context["regions"].append(region.get("name", "") if isinstance(region, dict) else str(region))

        return context

    def _load_authority_texts(self) -> List[Dict[str, Any]]:
        """Load authority metadata lazily so restoration results can cite sources."""
        if self._authority_texts is not None:
            return self._authority_texts

        data_dir = getattr(self.kg, "data_dir", os.path.join(os.path.dirname(os.path.dirname(__file__)), "data"))
        path = os.path.join(data_dir, "literature", "authoritative_recipe_texts.json")
        try:
            with open(path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except (OSError, json.JSONDecodeError):
            self._authority_texts = []
            return self._authority_texts

        if isinstance(payload, dict):
            items = payload.get("items") or payload.get("entries") or payload.get("texts") or []
        else:
            items = payload

        self._authority_texts = items if isinstance(items, list) else []
        return self._authority_texts

    def _find_authority_for_title(self, title: str) -> Dict[str, Any]:
        """Find catalog authority metadata for a source title when the graph node is sparse."""
        if not title:
            return {}

        for item in self._load_authority_texts():
            titles = [item.get("title", "")]
            titles.extend(item.get("included_texts", []) or [])
            if title in titles:
                return item
        return {}

    def _authority_value(self, authority_entry: Dict[str, Any], key: str) -> str:
        authority = authority_entry.get("authority") if isinstance(authority_entry, dict) else {}
        if isinstance(authority, dict) and authority.get(key):
            return authority.get(key)
        return authority_entry.get(key, "") if isinstance(authority_entry, dict) else ""

    def _build_citations(self, dish_id: str, dish_info: Dict[str, Any], recipe: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Build machine-readable citations for source text and recipe evidence."""
        citations: List[Dict[str, Any]] = []
        seen = set()
        source_relationships = self.kg.get_relationships(source_id=dish_id, rel_type="recorded_in")

        for rel in source_relationships:
            source_node = self.kg.get_node(rel.get("target", "")) or {}
            recipe_source = recipe.get("source", "") if recipe else ""
            source_title = source_node.get("title") or dish_info.get("source_text") or recipe_source
            authority_entry = self._find_authority_for_title(source_title)
            props = rel.get("properties", {}) or {}
            source_url = (
                source_node.get("source_url")
                or self._authority_value(authority_entry, "source_url")
                or f"internal:data/knowledge_graph/nodes_ancient_text.json#{source_node.get('id', rel.get('target', 'unknown'))}"
            )
            key = ("source_text", source_title, props.get("chapter"))
            if key in seen:
                continue
            seen.add(key)
            citations.append({
                "id": source_node.get("id", rel.get("target", "")),
                "dish_id": dish_id,
                "dish_name": dish_info.get("name", ""),
                "evidence_type": "source_text",
                "title": source_title,
                "author": source_node.get("author") or authority_entry.get("author", ""),
                "dynasty": source_node.get("dynasty") or authority_entry.get("dynasty", ""),
                "chapter": props.get("chapter", ""),
                "page_reference": props.get("page_reference", ""),
                "excerpt": dish_info.get("source_passage", ""),
                "source_url": source_url,
                "catalog_url": source_node.get("catalog_url") or self._authority_value(authority_entry, "catalog_url"),
                "authority_institution": (
                    source_node.get("authority_institution")
                    or self._authority_value(authority_entry, "institution")
                    or self._authority_value(authority_entry, "source_name")
                ),
                "verification_note": (
                    source_node.get("verification_note")
                    or self._authority_value(authority_entry, "verification_note")
                    or "知识图谱记录了菜品与古籍文本的 recorded_in 关系，当前条目仍需专家复核。"
                ),
                "license_note": "仅保存短摘录、结构化元数据和目录链接；完整原文请以权威馆藏或正式出版物为准。",
                "copyright_note": "古籍原文与现代整理版本版权状态可能不同，产品展示应限制为必要短摘录和出处说明。",
                "expertReviewed": False,
            })

        if recipe:
            source_title = recipe.get("source", "")
            authority_entry = self._find_authority_for_title(source_title.replace("《", "").split("》")[0])
            key = ("recipe", source_title, recipe.get("original_text", ""))
            if key not in seen:
                citations.append({
                    "id": recipe.get("id", f"recipe-{dish_id}"),
                    "dish_id": dish_id,
                    "dish_name": dish_info.get("name", recipe.get("dish_name", "")),
                    "evidence_type": "recipe",
                    "title": source_title,
                    "author": authority_entry.get("author", ""),
                    "dynasty": recipe.get("dynasty") or authority_entry.get("dynasty", ""),
                    "chapter": source_title,
                    "page_reference": "",
                    "excerpt": recipe.get("original_text", ""),
                    "source_url": self._authority_value(authority_entry, "source_url") or f"internal:data/recipes/ancient_recipes.json#{recipe.get('id', dish_id)}",
                    "catalog_url": self._authority_value(authority_entry, "catalog_url"),
                    "authority_institution": self._authority_value(authority_entry, "institution") or self._authority_value(authority_entry, "source_name"),
                    "verification_note": self._authority_value(authority_entry, "verification_note") or "本地古食方库中的结构化复原条目，当前条目仍需专家复核。",
                    "license_note": "仅保存短摘录、结构化元数据和目录链接；完整原文请以权威馆藏或正式出版物为准。",
                    "copyright_note": "古籍原文与现代整理版本版权状态可能不同，产品展示应限制为必要短摘录和出处说明。",
                    "expertReviewed": False,
                })

        return citations

    def _build_ai_metadata(self, started_at: float, llm_result: Optional[Dict[str, Any]], fallback_reason: str = "") -> Dict[str, Any]:
        latency_ms = max(0, int((time.perf_counter() - started_at) * 1000))
        if llm_result:
            return {
                "provider": "doubao-compatible",
                "model": getattr(self.llm, "model", ""),
                "latencyMs": latency_ms,
                "mode": "generated",
                "configured": True,
                "fallbackReason": None,
            }

        configured = bool(getattr(self.llm, "is_available", False))
        return {
            "provider": "local-python",
            "model": "knowledge-graph-rules",
            "latencyMs": latency_ms,
            "mode": "degraded" if configured and fallback_reason else "local",
            "configured": False,
            "fallbackReason": fallback_reason or None,
        }

    def _clamp_evidence_score(self, value: Any) -> int:
        try:
            number = float(value)
        except (TypeError, ValueError):
            return 0
        return max(0, min(100, round(number)))

    def _calculate_evidence_score(self, breakdown: Dict[str, Any]) -> int:
        return self._clamp_evidence_score(
            breakdown.get("clueMatch", 0) * 0.3
            + breakdown.get("sourceMatch", 0) * 0.3
            + breakdown.get("ingredientMatch", 0) * 0.2
            + breakdown.get("techniqueMatch", 0) * 0.2
        )

    def _insufficient_evidence_payload(self, reason: str = "") -> Dict[str, Any]:
        return {
            "evidenceScore": 0,
            "evidenceBreakdown": {
                "clueMatch": 0,
                "sourceMatch": 0,
                "ingredientMatch": 0,
                "techniqueMatch": 0,
                "overallReason": reason or "Insufficient evidence to produce a reliable restoration.",
            },
        }

    def _build_evidence_payload(
        self,
        *,
        match_confidence: Optional[float] = None,
        citations: Optional[List[Dict[str, Any]]] = None,
        source_text: str = "",
        source_url: str = "",
        ingredients: Optional[List[Any]] = None,
        techniques: Optional[List[Any]] = None,
        steps: Optional[List[Any]] = None,
    ) -> Dict[str, Any]:
        citations = citations or []
        ingredients = ingredients or []
        techniques = techniques or []
        steps = steps or []
        clue_match = self._clamp_evidence_score((match_confidence if match_confidence is not None else 0.85) * 100)
        source_match = 100 if citations else self._clamp_evidence_score(75 if (source_text or source_url) else 0)
        breakdown = {
            "clueMatch": clue_match,
            "sourceMatch": source_match,
            "ingredientMatch": self._clamp_evidence_score(80 if ingredients else 0),
            "techniqueMatch": self._clamp_evidence_score(80 if (techniques or steps) else 0),
            "overallReason": "Evidence combines matched clues, source citations, ingredients, and cooking techniques.",
        }
        return {
            "evidenceScore": self._calculate_evidence_score(breakdown),
            "evidenceBreakdown": breakdown,
        }

    def restore_dish(self, dish_id: str) -> Dict[str, Any]:
        """
        复原指定菜品（LLM增强版）
        返回完整的复原信息，包含LLM推理的详细步骤和文化注释
        """
        started_at = time.perf_counter()
        dish_info = self.kg.get_dish_full_info(dish_id)
        if not dish_info:
            return {"error": f"未找到菜品: {dish_id}"}

        # 查找食方
        recipe = self.kg.get_recipe_by_dish(dish_info["name"])

        # 构建知识上下文
        context = self._build_context(dish_info)

        # 尝试LLM推理
        llm_result = None
        llm_fallback_reason = ""
        if self.llm.is_available:
            try:
                source_text = dish_info.get("source_passage", "")
                if source_text:
                    llm_result = self.llm.reason_restoration(source_text, context)
            except Exception:
                llm_fallback_reason = "LLM restoration failed; local knowledge-graph rules used."
                llm_result = None
            if not llm_result and not llm_fallback_reason:
                llm_fallback_reason = "LLM returned no structured restoration; local knowledge-graph rules used."

        # 生成食材替换建议
        ingredient_suggestions = []
        for ing in dish_info.get("ingredients", []):
            suggestion = {
                "name": ing["name"],
                "original_role": ing.get("role", ""),
                "is_extinct": ing.get("is_extinct", False),
                "substitutes": []
            }
            if ing.get("is_extinct") or ing.get("modern_substitute"):
                subs = self.kg.get_substitute_ingredients(ing["id"])
                for sub in subs:
                    suggestion["substitutes"].append({
                        "name": sub["name"],
                        "similarity": sub.get("similarity", 0),
                        "notes": sub.get("notes", "")
                    })
                if ing.get("modern_substitute") and not subs:
                    suggestion["substitutes"].append({
                        "name": ing["modern_substitute"],
                        "similarity": 0.5,
                        "notes": "通用替代品"
                    })
            ingredient_suggestions.append(suggestion)

        # 构建制作步骤
        steps = []
        if recipe:
            steps = recipe.get("steps", [])
        else:
            for tech in dish_info.get("techniques", []):
                steps.append(f"步骤{tech.get('step_order', '?')}: {tech.get('step_description', '')}")

        # 基础结果
        citations = self._build_citations(dish_id, dish_info, recipe)
        first_citation = citations[0] if citations else {}
        evidence_payload = self._build_evidence_payload(
            citations=citations,
            source_text=dish_info.get("source_passage", ""),
            source_url=first_citation.get("source_url", ""),
            ingredients=ingredient_suggestions,
            techniques=dish_info.get("techniques", []),
            steps=steps,
        )
        result = {
            "dish_id": dish_id,
            "dish_name": dish_info["name"],
            "dynasty": dish_info.get("dynasty", {}).get("name", "未知"),
            "source": dish_info.get("source_text", {}).get("title", "未知") if isinstance(dish_info.get("source_text"), dict) else "未知",
            "source_url": first_citation.get("source_url", ""),
            "original_text": dish_info.get("source_passage", ""),
            "description": dish_info.get("description", ""),
            "difficulty": dish_info.get("difficulty", "未知"),
            "taste_profile": dish_info.get("taste_profile", ""),
            "ingredients": ingredient_suggestions,
            "techniques": [t["name"] for t in dish_info.get("techniques", [])],
            "steps": steps,
            "cooking_time": dish_info.get("cooking_time", "未知"),
            "servings": dish_info.get("servings", 1),
            "cultural_notes": recipe.get("cultural_notes", "") if recipe else "",
            "modern_adaptation": recipe.get("modern_adaptation", "") if recipe else "",
            "regions": [r["name"] for r in dish_info.get("regions", [])],
            "seasons": [s["name"] for s in dish_info.get("seasons", [])],
            "llm_enhanced": False,
            "citations": citations,
            "verification_note": first_citation.get("verification_note", "当前复原结果由知识图谱和规则生成，仍需专家复核。"),
            "license_note": first_citation.get("license_note", "仅保存短摘录、结构化元数据和目录链接；完整原文请以权威馆藏或正式出版物为准。"),
            "copyright_note": first_citation.get("copyright_note", "古籍原文与现代整理版本版权状态可能不同，产品展示应限制为必要短摘录和出处说明。"),
            "expertReviewed": False,
            "evidenceScore": evidence_payload["evidenceScore"],
            "evidenceBreakdown": evidence_payload["evidenceBreakdown"],
            "ai_metadata": self._build_ai_metadata(started_at, llm_result, llm_fallback_reason)
        }

        # 如果有LLM推理结果，合并增强
        if llm_result:
            result["llm_enhanced"] = True
            # 推理步骤详情
            result["reasoning_steps"] = {
                "step1_parsing": llm_result.get("step1_parsing", {}),
                "step2_verification": llm_result.get("step2_verification", {}),
                "step3_technique_conversion": llm_result.get("step3_technique_conversion", []),
            }
            # LLM生成的复原方案
            plan = llm_result.get("step4_restoration_plan", {})
            if plan:
                if plan.get("cooking_steps"):
                    result["llm_steps"] = plan["cooking_steps"]
                if plan.get("ingredients"):
                    result["llm_ingredients"] = plan["ingredients"]
                if plan.get("cultural_notes"):
                    result["cultural_notes"] = plan["cultural_notes"]
                if plan.get("modern_adaptation"):
                    result["modern_adaptation"] = plan["modern_adaptation"]
                if plan.get("difficulty"):
                    result["difficulty"] = plan["difficulty"]
                if plan.get("cooking_time"):
                    result["cooking_time"] = plan["cooking_time"]
                if plan.get("taste_profile"):
                    result["taste_profile"] = plan["taste_profile"]

        return result

    def query_and_restore(self, text: str) -> Dict[str, Any]:
        """
        完整的复原推理流程
        输入文本 → 解析线索 → 匹配菜品 → 复原信息
        """
        # 第一步：解析线索
        clues = self.analyze_text(text)

        result = {
            "input_text": text,
            "analysis": {
                "detected_dishes": len(clues["matched_dishes"]),
                "detected_ingredients": len(clues["matched_ingredients"]),
                "detected_techniques": len(clues["matched_techniques"]),
            },
            "restorations": [],
            "suggestions": [],
            "evidence_status": "pending",
            "needs_more_clues": False
        }

        # 第二步：对匹配到的菜品进行复原
        if clues["matched_dishes"]:
            for match in clues["matched_dishes"]:
                restoration = self.restore_dish(match["id"])
                restoration["match_confidence"] = match.get("confidence", 0)
                result["restorations"].append(restoration)
        else:
            # 没有直接匹配到菜品，尝试根据食材和技法推荐
            result["suggestions"] = self._suggest_by_clues(clues)
            for suggestion in result["suggestions"]:
                if suggestion.get("match_score", 0) >= 0.45:
                    restoration = self.restore_dish(suggestion["dish_id"])
                    restoration["match_confidence"] = suggestion.get("match_score", 0)
                    restoration["match_reason"] = suggestion.get("reason", "")
                    result["restorations"].append(restoration)

        if result["restorations"]:
            result["evidence_status"] = "sufficient"
            result["needs_more_clues"] = False
            result["evidenceScore"] = result["restorations"][0].get("evidenceScore", 0)
            result["evidenceBreakdown"] = result["restorations"][0].get("evidenceBreakdown", {})
        else:
            result["evidence_status"] = "insufficient"
            result["needs_more_clues"] = True
            result.update(self._insufficient_evidence_payload("No reliable dish match was found from the provided clues."))

        return result

    def _suggest_by_clues(self, clues: Dict[str, Any]) -> List[Dict[str, Any]]:
        """根据线索推荐可能的菜品"""
        suggestions = []

        # 根据食材推荐
        if clues["matched_ingredients"]:
            ing_ids = {m["id"] for m in clues["matched_ingredients"]}
            for dish in self.kg.get_nodes_by_type("dish"):
                dish_ing_rels = self.kg.get_relationships(source_id=dish["id"], rel_type="contains")
                dish_ing_ids = {r["target"] for r in dish_ing_rels}
                overlap = ing_ids & dish_ing_ids
                if overlap:
                    suggestions.append({
                        "dish_id": dish["id"],
                        "dish_name": dish["name"],
                        "reason": f"使用了相同食材: {', '.join(self.kg.get_node(i)['name'] for i in overlap)}",
                        "match_score": len(overlap) / len(dish_ing_ids) if dish_ing_ids else 0
                    })

        # 按匹配度排序
        suggestions.sort(key=lambda x: x.get("match_score", 0), reverse=True)
        return suggestions[:5]

    def get_all_dishes(self) -> List[Dict[str, Any]]:
        """获取所有可复原的菜品列表"""
        dishes = self.kg.get_nodes_by_type("dish")
        return [{
            "id": d["id"],
            "name": d["name"],
            "dynasty": d.get("dynasty", ""),
            "difficulty": d.get("difficulty", ""),
            "source": d.get("source_text", "")
        } for d in dishes]

    def get_dynasty_food_culture(self, dynasty_id: str) -> Dict[str, Any]:
        """获取朝代饮食文化信息"""
        dynasty = self.kg.get_node(dynasty_id)
        if not dynasty:
            return {"error": "未找到该朝代"}

        # 获取该朝代的菜品
        dishes = [d for d in self.kg.get_nodes_by_type("dish")
                  if d.get("dynasty") == dynasty.get("name")]

        return {
            "dynasty": dynasty["name"],
            "period": f"{dynasty.get('start_year', '?')} - {dynasty.get('end_year', '?')}",
            "food_culture": dynasty.get("food_culture", ""),
            "dishes": [{"id": d["id"], "name": d["name"]} for d in dishes]
        }

    def search_and_restore(self, keyword: str) -> Dict[str, Any]:
        """搜索并复原"""
        results = self.kg.search_by_name(keyword)
        restorations = []
        for node in results:
            if node.get("_type") == "dish":
                restorations.append(self.restore_dish(node["id"]))
            elif node.get("_type") == "recipe":
                # 查找对应菜品
                dish = next((d for d in self.kg.get_nodes_by_type("dish")
                             if d.get("name") == node.get("dish_name")), None)
                if dish:
                    restorations.append(self.restore_dish(dish["id"]))

        return {
            "keyword": keyword,
            "total_results": len(results),
            "restorations": restorations
        }


# 全局实例
_engine_instance: Optional[RestorationEngine] = None


def get_restoration_engine() -> RestorationEngine:
    """获取复原引擎单例"""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = RestorationEngine()
    return _engine_instance
