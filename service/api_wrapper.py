#!/usr/bin/env python3
"""
Node.js与Python复原引擎之间的桥梁脚本
用法: python api_wrapper.py <action> <input_json>
支持的action: analyze, restore, list_dishes, teach, star_map, evolution
输出: JSON格式结果到stdout
"""
import sys
import os
import json
import logging

# 确保service包可被正确导入
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 配置日志
logger = logging.getLogger(__name__)

from service.restoration_engine import get_restoration_engine
from service.knowledge_graph import get_knowledge_graph
from service.image_generator import get_image_generator
from service.llm_reasoner import get_llm_reasoner


CURATED_FUSION_NAMES = {
    ("东坡肉", "槐叶冷淘"): "槐香东坡",
    ("东坡肉", "玉糁羹"): "玉糁东坡",
    ("东坡肉", "王太守八宝豆腐"): "八珍东坡",
    ("东坡肉", "莲房鱼包"): "莲房东坡",
    ("东坡肉", "荷包鱼"): "东坡荷鱼",
    ("东坡肉", "荔枝腰子"): "荔香东坡",
    ("东坡肉", "蟹酿橙"): "橙蟹东坡",
    ("东坡肉", "浑羊殁忽"): "东坡浑羊",
    ("东坡肉", "驼蹄羹"): "东坡驼羹",
    ("槐叶冷淘", "玉糁羹"): "碧槐玉糁",
    ("槐叶冷淘", "王太守八宝豆腐"): "槐香八珍",
    ("槐叶冷淘", "莲房鱼包"): "槐叶莲鱼",
    ("槐叶冷淘", "荷包鱼"): "槐香荷鱼",
    ("槐叶冷淘", "荔枝腰子"): "槐荔玉腰",
    ("槐叶冷淘", "蟹酿橙"): "槐香橙蟹",
    ("槐叶冷淘", "浑羊殁忽"): "槐风浑羊",
    ("槐叶冷淘", "驼蹄羹"): "槐风驼羹",
    ("玉糁羹", "王太守八宝豆腐"): "玉糁八珍",
    ("玉糁羹", "莲房鱼包"): "莲房玉糁",
    ("玉糁羹", "荷包鱼"): "玉糁荷鱼",
    ("玉糁羹", "荔枝腰子"): "玉糁荔腰",
    ("玉糁羹", "蟹酿橙"): "玉糁橙蟹",
    ("玉糁羹", "浑羊殁忽"): "玉糁羊羹",
    ("玉糁羹", "驼蹄羹"): "玉糁驼羹",
    ("王太守八宝豆腐", "莲房鱼包"): "莲房八珍",
    ("王太守八宝豆腐", "荷包鱼"): "八珍荷鱼",
    ("王太守八宝豆腐", "荔枝腰子"): "荔腰八珍",
    ("王太守八宝豆腐", "蟹酿橙"): "橙蟹八珍",
    ("王太守八宝豆腐", "浑羊殁忽"): "八珍浑羊",
    ("王太守八宝豆腐", "驼蹄羹"): "八珍驼羹",
    ("莲房鱼包", "荷包鱼"): "荷莲鱼包",
    ("莲房鱼包", "荔枝腰子"): "荔香莲鱼",
    ("莲房鱼包", "蟹酿橙"): "莲房橙蟹",
    ("莲房鱼包", "浑羊殁忽"): "莲房浑羊",
    ("莲房鱼包", "驼蹄羹"): "莲房驼羹",
    ("荷包鱼", "荔枝腰子"): "荔香荷鱼",
    ("荷包鱼", "蟹酿橙"): "荷鱼橙蟹",
    ("荷包鱼", "浑羊殁忽"): "荷鱼浑羊",
    ("荷包鱼", "驼蹄羹"): "驼羹荷鱼",
    ("荔枝腰子", "蟹酿橙"): "荔橙蟹腰",
    ("荔枝腰子", "浑羊殁忽"): "荔腰浑羊",
    ("荔枝腰子", "驼蹄羹"): "荔腰驼羹",
    ("蟹酿橙", "浑羊殁忽"): "橙蟹羊脯",
    ("蟹酿橙", "驼蹄羹"): "橙蟹驼羹",
    ("浑羊殁忽", "驼蹄羹"): "驼蹄浑羊",
}

DISH_NAME_ANCHORS = {
    "蟹酿橙": "橙蟹",
    "槐叶冷淘": "碧槐",
    "玉糁羹": "玉糁",
    "王太守八宝豆腐": "八珍",
    "驼蹄羹": "驼羹",
    "浑羊殁忽": "浑羊",
    "荷包鱼": "荷鱼",
    "荔枝腰子": "荔腰",
    "莲房鱼包": "莲房",
    "东坡肉": "东坡",
}


def _curated_fusion_name(first_name, second_name):
    return (
        CURATED_FUSION_NAMES.get((first_name, second_name))
        or CURATED_FUSION_NAMES.get((second_name, first_name))
    )


def _fallback_anchor(name):
    anchor = "".join(
        char for char in str(name or "")
        if char not in "菜品料理羹汤肉鱼包豆腐冷淘融合新式古法"
    )
    return anchor[:2] or "风味"


def _is_mechanical_fusion_name(name, first_name, second_name):
    value = str(name or "").strip()
    if not value or len(value) > 6:
        return True
    if "融合" in value or "×" in value or "x" in value.lower() or "拼" in value:
        return True
    if value in {f"{first_name}{second_name}", f"{second_name}{first_name}"}:
        return True
    return first_name in value and second_name in value


def build_fusion_name(first_name, second_name, proposed_name=""):
    curated = _curated_fusion_name(first_name, second_name)
    if curated:
        return curated

    proposed = str(proposed_name or "").strip()
    if not _is_mechanical_fusion_name(proposed, first_name, second_name):
        return proposed

    first_anchor = DISH_NAME_ANCHORS.get(first_name) or _fallback_anchor(first_name)
    second_anchor = DISH_NAME_ANCHORS.get(second_name) or _fallback_anchor(second_name)
    return f"{first_anchor}{second_anchor}"[:6] or "风味新馔"


def analyze(input_data):
    """分析古籍文本，提取线索（LLM增强版）"""
    engine = get_restoration_engine()
    text = input_data.get("text", "")
    if not text:
        return {"error": "缺少text参数"}
    
    # 使用query_and_restore进行完整分析+复原
    result = engine.query_and_restore(text)
    
    # 同时获取纯分析结果（已集成LLM推理）
    clues = engine.analyze_text(text)
    
    return {
        "clues": clues,
        "restorations": result.get("restorations", []),
        "suggestions": result.get("suggestions", []),
        "analysis": result.get("analysis", {})
    }


def restore(input_data):
    """复原指定菜品（LLM增强版，含推理步骤和文化注释）"""
    engine = get_restoration_engine()
    dish_id = input_data.get("dish_id", "")
    if not dish_id:
        return {"error": "缺少dish_id参数"}
    
    result = engine.restore_dish(dish_id)
    return result


def list_dishes(input_data):
    """列出所有可复原菜品"""
    engine = get_restoration_engine()
    dishes = engine.get_all_dishes()
    return {"dishes": dishes}


def teach(input_data):
    """数字传承人教学对话（LLM增强版）"""
    kg = get_knowledge_graph()
    llm = get_llm_reasoner()
    dish_id = input_data.get("dish_id", "")
    question = input_data.get("question", "")
    
    if not dish_id:
        return {"error": "缺少dish_id参数"}
    
    # 获取菜品完整信息
    dish_info = kg.get_dish_full_info(dish_id)
    if not dish_info:
        return {"error": f"未找到菜品: {dish_id}"}
    
    # 尝试LLM推理回答
    if llm.is_available:
        try:
            llm_answer = llm.reason_teach(dish_info, question)
            if llm_answer:
                return {
                    "dish_id": dish_id,
                    "dish_name": dish_info["name"],
                    "question": question,
                    "answer": llm_answer.get("answer", ""),
                    "tips": llm_answer.get("tips", []),
                    "historical_fact": llm_answer.get("historical_fact", ""),
                    "suggestions": llm_answer.get("suggestions", []),
                    "llm_enhanced": True
                }
        except Exception as exc:
            logger.warning("LLM reasoning failed; using keyword matching fallback: %s", exc)
    
    # Fallback: 关键词匹配回答
    recipe = kg.get_recipe_by_dish(dish_info["name"])
    
    answer = ""
    tips = []
    historical_fact = ""
    
    q_lower = question.lower()
    
    if any(kw in q_lower for kw in ["历史", "起源", "由来", "来源"]):
        dynasty = dish_info.get("dynasty", {})
        dynasty_name = dynasty.get("name", "古代") if isinstance(dynasty, dict) else str(dynasty)
        answer = f"{dish_info['name']}的历史可以追溯到{dynasty_name}。"
        answer += f"{dish_info.get('description', '')}"
        if recipe:
            answer += f"此菜出自《{recipe.get('source_text', dish_info.get('source_text', {}).get('title', '古籍') if isinstance(dish_info.get('source_text'), dict) else '古籍')}》。"
        historical_fact = f"{dish_info['name']}是{dynasty_name}时期的代表性菜品。"
        tips = ["了解菜品的历史背景有助于理解其烹饪技法", "可以对比同时期其他菜品的特点"]
        
    elif any(kw in q_lower for kw in ["做法", "制作", "烹饪", "步骤", "怎么"]):
        steps = []
        if recipe:
            steps = recipe.get("steps", [])
        if not steps:
            techniques = dish_info.get("techniques", [])
            for tech in techniques:
                if isinstance(tech, dict):
                    steps.append(tech.get("step_description", tech.get("name", "")))
        
        if steps:
            answer = f"制作{dish_info['name']}的步骤如下：\n"
            for i, step in enumerate(steps, 1):
                answer += f"{i}. {step}\n"
        else:
            answer = f"{dish_info['name']}的具体制作方法已失传，但根据文献记载，可以推测其基本做法。"
            techniques = dish_info.get("techniques", [])
            if techniques:
                tech_names = [t.get("name", "") if isinstance(t, dict) else str(t) for t in techniques]
                answer += f"使用的烹饪技法包括：{'、'.join(tech_names)}。"
        
        tips = ["火候是关键，要根据食材特性调整", "建议先小量尝试，掌握后再正式制作"]
        historical_fact = "古代烹饪讲究'火候'，认为这是决定菜品成败的关键。"
        
    elif any(kw in q_lower for kw in ["食材", "原料", "材料", "用什么"]):
        ingredients = dish_info.get("ingredients", [])
        if ingredients:
            answer = f"{dish_info['name']}的主要食材包括：\n"
            for ing in ingredients:
                name = ing.get("name", "")
                role = ing.get("role", "")
                quantity = ing.get("quantity", "")
                is_extinct = ing.get("is_extinct", False)
                answer += f"- {name}"
                if role:
                    answer += f"（{role}）"
                if quantity:
                    answer += f"，用量{quantity}"
                if is_extinct:
                    answer += "，此食材已罕见"
                    subs = ing.get("substitutes", [])
                    if subs:
                        sub_names = [s.get("name", "") for s in subs]
                        answer += f"，可用{'、'.join(sub_names)}替代"
                answer += "\n"
        else:
            answer = f"{dish_info['name']}的具体食材已难以完全考证。"
        
        tips = ["食材的新鲜度很重要", "古代食材可能需要现代替代品"]
        historical_fact = "古人讲究'不时不食'，认为应季食材最能体现食物的本味。"
        
    elif any(kw in q_lower for kw in ["文化", "意义", "故事", "典故"]):
        answer = f"{dish_info['name']}不仅是一道美食，更承载着深厚的中华饮食文化。"
        cultural_notes = recipe.get("cultural_notes", "") if recipe else ""
        if cultural_notes:
            answer += cultural_notes
        else:
            answer += f"它体现了{dish_info.get('dynasty', {}).get('name', '古代') if isinstance(dish_info.get('dynasty'), dict) else '古代'}时期人们对美食的追求和对生活品质的向往。"
        
        tips = ["了解文化背景能加深对菜品的理解", "可以探索同时期的其他饮食文化"]
        historical_fact = "中华饮食文化源远流长，是世界饮食文化的重要组成部分。"
        
    elif any(kw in q_lower for kw in ["替代", "现代", "今天"]):
        ingredients = dish_info.get("ingredients", [])
        extinct_items = [ing for ing in ingredients if ing.get("is_extinct") or ing.get("substitutes")]
        if extinct_items:
            answer = f"{dish_info['name']}中部分食材在现代已较难获得，以下是替代建议：\n"
            for ing in extinct_items:
                subs = ing.get("substitutes", [])
                if subs:
                    sub_info = [f"{s.get('name', '')}(相似度{s.get('similarity', 0):.0%})" for s in subs]
                    answer += f"- {ing.get('name', '')}可用{'、'.join(sub_info)}替代\n"
        else:
            answer = f"{dish_info['name']}所用食材在现代仍然常见，可以直接按照古法制作。"
        
        modern_adaptation = recipe.get("modern_adaptation", "") if recipe else ""
        if modern_adaptation:
            answer += f"\n现代改良建议：{modern_adaptation}"
        
        tips = ["替代食材虽能还原风味，但与原始风味仍有差异", "建议尝试多种替代方案找到最佳选择"]
        historical_fact = "许多古代食材因环境变化已难以获得，但现代食材科学提供了替代方案。"
        
    else:
        answer = f"关于{dish_info['name']}，这是一道来自{dish_info.get('dynasty', {}).get('name', '古代') if isinstance(dish_info.get('dynasty'), dict) else '古代'}的经典名菜。"
        answer += f"{dish_info.get('description', '')}"
        if recipe:
            cultural_notes = recipe.get("cultural_notes", "")
            if cultural_notes:
                answer += f"\n{cultural_notes}"
        
        tips = [
            "您可以问我这道菜的历史起源",
            "您可以问我这道菜的制作方法",
            "您可以问我这道菜需要哪些食材",
            "您可以问我这道菜的文化意义"
        ]
        historical_fact = f"{dish_info['name']}是中华饮食文化的瑰宝。"
    
    return {
        "dish_id": dish_id,
        "dish_name": dish_info["name"],
        "question": question,
        "answer": answer.strip(),
        "tips": tips,
        "historical_fact": historical_fact,
        "suggestions": [
            f"{dish_info['name']}的历史是什么？",
            f"怎么制作{dish_info['name']}？",
            f"{dish_info['name']}需要哪些食材？",
            f"{dish_info['name']}有什么文化意义？"
        ],
        "llm_enhanced": False
    }


def star_map(input_data):
    """获取味觉星图数据"""
    kg = get_knowledge_graph()
    
    dishes = kg.get_nodes_by_type("dish")
    relationships = kg.relationships
    
    # 构建菜品列表，包含位置信息
    dish_list = []
    for i, dish in enumerate(dishes):
        # 计算位置 - 基于朝代和口味特征分布
        dynasty = dish.get("dynasty", "")
        dynasty_x_map = {
            "先秦": 0.1, "汉代": 0.2, "晋代": 0.25,
            "唐代": 0.35, "宋代": 0.5, "元代": 0.6,
            "明代": 0.7, "清代": 0.85
        }
        x = dynasty_x_map.get(dynasty, 0.5) + (i % 3) * 0.05
        
        # 基于difficulty计算y
        difficulty = dish.get("difficulty", "中等")
        difficulty_y = {"简单": 0.2, "中等": 0.5, "困难": 0.75, "极难": 0.9}
        y = difficulty_y.get(difficulty, 0.5) + (i % 4) * 0.03
        
        dish_list.append({
            "id": dish["id"],
            "name": dish["name"],
            "dynasty": dynasty,
            "difficulty": difficulty,
            "taste_profile": dish.get("taste_profile", ""),
            "description": dish.get("description", ""),
            "x": round(min(max(x, 0.05), 0.95), 2),
            "y": round(min(max(y, 0.05), 0.95), 2),
            "size": 15 + len(dish.get("description", "")) // 10,
            "source_text": dish.get("source_text", "")
        })
    
    # 构建连接关系（同一朝代的菜品相连）
    connections = []
    for i, d1 in enumerate(dish_list):
        for j, d2 in enumerate(dish_list):
            if i < j and d1["dynasty"] == d2["dynasty"]:
                connections.append({
                    "from": d1["id"],
                    "to": d2["id"],
                    "type": "same_dynasty"
                })
    
    # 添加食材共享连接
    contains_rels = [r for r in relationships if r["type"] == "contains"]
    dish_ingredients = {}
    for rel in contains_rels:
        dish_ingredients.setdefault(rel["source"], set()).add(rel["target"])
    
    dish_ids = [d["id"] for d in dish_list]
    for i, d1_id in enumerate(dish_ids):
        for j, d2_id in enumerate(dish_ids):
            if i < j:
                shared = dish_ingredients.get(d1_id, set()) & dish_ingredients.get(d2_id, set())
                if shared:
                    connections.append({
                        "from": d1_id,
                        "to": d2_id,
                        "type": "shared_ingredient"
                    })
    
    return {
        "dishes": dish_list,
        "connections": connections
    }


def evolution(input_data):
    """风味进化 - 融合两个菜品（LLM增强版）"""
    kg = get_knowledge_graph()
    engine = get_restoration_engine()
    llm = get_llm_reasoner()
    
    dish_id_1 = input_data.get("dish_id_1", "")
    dish_id_2 = input_data.get("dish_id_2", "")
    
    if not dish_id_1 or not dish_id_2:
        return {"error": "需要提供两个菜品ID: dish_id_1 和 dish_id_2"}
    
    info1 = kg.get_dish_full_info(dish_id_1)
    info2 = kg.get_dish_full_info(dish_id_2)
    
    if not info1:
        return {"error": f"未找到菜品: {dish_id_1}"}
    if not info2:
        return {"error": f"未找到菜品: {dish_id_2}"}
    
    # 尝试LLM推理融合
    if llm.is_available:
        try:
            llm_fusion = llm.reason_evolution(info1, info2)
            if llm_fusion:
                new_name = build_fusion_name(info1["name"], info2["name"], llm_fusion.get("new_name", ""))
                return {
                    "new_dish": {
                        "name": new_name,
                        "description": llm_fusion.get("concept", ""),
                        "dynasty": f"{info1.get('dynasty', {}).get('name', '古代') if isinstance(info1.get('dynasty'), dict) else '古代'}→{info2.get('dynasty', {}).get('name', '古代') if isinstance(info2.get('dynasty'), dict) else '古代'}融合",
                        "taste_profile": llm_fusion.get("taste_evolution", ""),
                        "difficulty": "困难",
                        "ingredients": llm_fusion.get("ingredients", []),
                        "techniques": llm_fusion.get("fusion_techniques", []),
                        "cooking_steps": llm_fusion.get("cooking_steps", []),
                        "cooking_time": "60分钟",
                        "servings": 4,
                        "cultural_significance": llm_fusion.get("cultural_significance", "")
                    },
                    "source_dishes": [
                        {"id": dish_id_1, "name": info1["name"], "dynasty": info1.get("dynasty", {}).get("name", "") if isinstance(info1.get("dynasty"), dict) else ""},
                        {"id": dish_id_2, "name": info2["name"], "dynasty": info2.get("dynasty", {}).get("name", "") if isinstance(info2.get("dynasty"), dict) else ""}
                    ],
                    "fusion_concept": llm_fusion.get("concept", ""),
                    "llm_enhanced": True
                }
        except Exception as exc:
            logger.warning("LLM fusion failed; falling back to rule-based merge: %s", exc)
    
    # Fallback: 规则合并
    merged_ingredients = []
    seen = set()
    for ing in info1.get("ingredients", []) + info2.get("ingredients", []):
        name = ing.get("name", "")
        if name and name not in seen:
            seen.add(name)
            merged_ingredients.append({
                "name": name,
                "role": ing.get("role", ""),
                "origin": "dish_1" if ing in info1.get("ingredients", []) else "dish_2"
            })
    
    merged_techniques = []
    seen_tech = set()
    for tech in info1.get("techniques", []) + info2.get("techniques", []):
        tech_name = tech.get("name", "") if isinstance(tech, dict) else str(tech)
        if tech_name and tech_name not in seen_tech:
            seen_tech.add(tech_name)
            merged_techniques.append(tech_name)
    
    new_name = build_fusion_name(info1["name"], info2["name"])
    new_description = f"将{info1['name']}与{info2['name']}的精髓融合，创造出一道全新的历史风味菜品。"
    new_description += f"继承了{info1['name']}的{info1.get('taste_profile', '')}特点，"
    new_description += f"融合了{info2['name']}的{info2.get('taste_profile', '')}风味。"
    
    taste1 = info1.get("taste_profile", "")
    taste2 = info2.get("taste_profile", "")
    
    return {
        "new_dish": {
            "name": new_name,
            "description": new_description,
            "dynasty": f"{info1.get('dynasty', {}).get('name', '古代') if isinstance(info1.get('dynasty'), dict) else '古代'}→{info2.get('dynasty', {}).get('name', '古代') if isinstance(info2.get('dynasty'), dict) else '古代'}融合",
            "taste_profile": f"{taste1} × {taste2}",
            "difficulty": "困难",
            "ingredients": merged_ingredients,
            "techniques": merged_techniques,
            "cooking_time": "60分钟",
            "servings": 4
        },
        "source_dishes": [
            {"id": dish_id_1, "name": info1["name"], "dynasty": info1.get("dynasty", {}).get("name", "") if isinstance(info1.get("dynasty"), dict) else ""},
            {"id": dish_id_2, "name": info2["name"], "dynasty": info2.get("dynasty", {}).get("name", "") if isinstance(info2.get("dynasty"), dict) else ""}
        ],
        "fusion_concept": f"这道菜融合了两个时代的烹饪智慧，将{info1['name']}的制作理念与{info2['name']}的技法相结合，创造出跨越时空的味觉体验。",
        "llm_enhanced": False
    }


def generate_image(input_data):
    """生成菜品成品图"""
    dish_name = input_data.get("dish_name", "")
    prompt_detail = input_data.get("prompt_detail", "")
    dynasty = input_data.get("dynasty", None)
    
    if not dish_name:
        return {"error": "缺少dish_name参数"}
    
    generator = get_image_generator()
    final_prompt = generator.build_prompt(dish_name, prompt_detail, dynasty)
    
    # 尝试调用AI图片生成API
    image_url = generator.generate_dish_image(dish_name, prompt_detail, dynasty)
    
    if image_url:
        return {
            "imageUrl": image_url,
            "type": "ai_generated",
            "dish_name": dish_name,
            "prompt": final_prompt
        }
    else:
        # 回退到SVG占位图
        placeholder = generator.generate_placeholder_svg(dish_name)
        return {
            "imageUrl": placeholder,
            "type": "placeholder",
            "dish_name": dish_name,
            "prompt": final_prompt
        }


ACTIONS = {
    "analyze": analyze,
    "restore": restore,
    "list_dishes": list_dishes,
    "teach": teach,
    "star_map": star_map,
    "evolution": evolution,
    "generate_image": generate_image,
}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "用法: python api_wrapper.py <action>"}))
        sys.exit(1)
    
    action = sys.argv[1]
    
    if action not in ACTIONS:
        print(json.dumps({"error": f"不支持的action: {action}，支持: {', '.join(ACTIONS.keys())}"}))
        sys.exit(1)
    
    # 解析输入JSON (从stdin读取)
    input_data = {}
    try:
        stdin_data = sys.stdin.read()
        if stdin_data.strip():
            input_data = json.loads(stdin_data)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"无效的JSON输入: {e}"}))
        sys.exit(1)
    
    try:
        result = ACTIONS[action](input_data)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
