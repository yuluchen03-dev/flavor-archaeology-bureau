"""
非遗美食知识图谱引擎
加载和查询知识图谱数据
"""
import json
import os
from typing import Dict, List, Optional, Any
from pathlib import Path


class KnowledgeGraph:
    """知识图谱数据管理器"""

    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
        self.data_dir = data_dir
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.relationships: List[Dict[str, Any]] = []
        self._load_data()

    def _load_data(self):
        """加载所有节点和关系数据"""
        kg_dir = os.path.join(self.data_dir, "knowledge_graph")

        # 加载节点
        node_files = {
            "dish": "nodes_dish.json",
            "ingredient": "nodes_ingredient.json",
            "technique": "nodes_technique.json",
            "dynasty": "nodes_dynasty.json",
            "region": "nodes_region.json",
            "season": "nodes_season.json",
            "ancient_text": "nodes_ancient_text.json",
        }

        for node_type, filename in node_files.items():
            filepath = os.path.join(kg_dir, filename)
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    items = json.load(f)
                    for item in items:
                        item["_type"] = node_type
                        self.nodes[item["id"]] = item

        # 加载关系
        rel_path = os.path.join(kg_dir, "relationships.json")
        if os.path.exists(rel_path):
            with open(rel_path, "r", encoding="utf-8") as f:
                self.relationships = json.load(f)

        # 加载食方数据
        recipes_path = os.path.join(self.data_dir, "recipes", "ancient_recipes.json")
        if os.path.exists(recipes_path):
            with open(recipes_path, "r", encoding="utf-8") as f:
                recipes = json.load(f)
                for recipe in recipes:
                    recipe["_type"] = "recipe"
                    self.nodes[recipe["id"]] = recipe

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        """获取节点信息"""
        return self.nodes.get(node_id)

    def get_nodes_by_type(self, node_type: str) -> List[Dict[str, Any]]:
        """按类型获取所有节点"""
        return [n for n in self.nodes.values() if n.get("_type") == node_type]

    def get_relationships(self, source_id: str = None, target_id: str = None,
                          rel_type: str = None) -> List[Dict[str, Any]]:
        """查询关系"""
        results = self.relationships
        if source_id:
            results = [r for r in results if r["source"] == source_id]
        if target_id:
            results = [r for r in results if r["target"] == target_id]
        if rel_type:
            results = [r for r in results if r["type"] == rel_type]
        return results

    def get_related_nodes(self, node_id: str, direction: str = "both") -> List[Dict[str, Any]]:
        """获取与某节点相关的所有节点"""
        related = []
        for rel in self.relationships:
            if direction in ("outgoing", "both") and rel["source"] == node_id:
                target = self.nodes.get(rel["target"])
                if target:
                    related.append({
                        "node": target,
                        "relationship": rel["type"],
                        "direction": "outgoing",
                        "properties": rel.get("properties", {})
                    })
            if direction in ("incoming", "both") and rel["target"] == node_id:
                source = self.nodes.get(rel["source"])
                if source:
                    related.append({
                        "node": source,
                        "relationship": rel["type"],
                        "direction": "incoming",
                        "properties": rel.get("properties", {})
                    })
        return related

    def search_by_name(self, keyword: str) -> List[Dict[str, Any]]:
        """按名称关键词搜索节点"""
        results = []
        for node in self.nodes.values():
            name = node.get("name", node.get("dish_name", node.get("title", "")))
            aliases = node.get("aliases", [])
            if keyword in name or any(keyword in a for a in aliases):
                results.append(node)
        return results

    def get_dish_ingredients(self, dish_id: str) -> List[Dict[str, Any]]:
        """获取菜品的食材列表"""
        rels = self.get_relationships(source_id=dish_id, rel_type="contains")
        ingredients = []
        for rel in rels:
            ing = self.nodes.get(rel["target"])
            if ing:
                ingredients.append({
                    **ing,
                    "quantity": rel.get("properties", {}).get("quantity", ""),
                    "role": rel.get("properties", {}).get("role", ""),
                    "preparation": rel.get("properties", {}).get("preparation", "")
                })
        return ingredients

    def get_dish_techniques(self, dish_id: str) -> List[Dict[str, Any]]:
        """获取菜品的烹饪技法"""
        rels = self.get_relationships(source_id=dish_id, rel_type="uses_technique")
        techniques = []
        for rel in sorted(rels, key=lambda r: r.get("properties", {}).get("step_order", 0)):
            tech = self.nodes.get(rel["target"])
            if tech:
                techniques.append({
                    **tech,
                    "step_order": rel.get("properties", {}).get("step_order", 0),
                    "step_description": rel.get("properties", {}).get("description", "")
                })
        return techniques

    def get_dish_full_info(self, dish_id: str) -> Optional[Dict[str, Any]]:
        """获取菜品的完整信息（含食材、技法、出处等）"""
        dish = self.nodes.get(dish_id)
        if not dish or dish.get("_type") != "dish":
            return None

        return {
            **dish,
            "ingredients": self.get_dish_ingredients(dish_id),
            "techniques": self.get_dish_techniques(dish_id),
            "dynasty": self._get_related_first(dish_id, "originated_in"),
            "regions": [r["node"] for r in self.get_related_nodes(dish_id)
                        if r["relationship"] == "popular_in"],
            "source_text": self._get_related_first(dish_id, "recorded_in"),
            "seasons": [r["node"] for r in self.get_related_nodes(dish_id)
                        if r["relationship"] == "seasonal_for"],
        }

    def _get_related_first(self, node_id: str, rel_type: str) -> Optional[Dict[str, Any]]:
        """获取第一个相关节点"""
        rels = self.get_relationships(source_id=node_id, rel_type=rel_type)
        if rels:
            return self.nodes.get(rels[0]["target"])
        return None

    def get_substitute_ingredients(self, ingredient_id: str) -> List[Dict[str, Any]]:
        """获取食材的替代品"""
        rels = self.get_relationships(source_id=ingredient_id, rel_type="substitute_for")
        substitutes = []
        for rel in rels:
            sub = self.nodes.get(rel["target"])
            if sub:
                substitutes.append({
                    **sub,
                    "similarity": rel.get("properties", {}).get("similarity", 0),
                    "notes": rel.get("properties", {}).get("notes", "")
                })
        return substitutes

    def get_recipes(self) -> List[Dict[str, Any]]:
        """获取所有古籍食方"""
        return self.get_nodes_by_type("recipe")

    def get_recipe_by_dish(self, dish_name: str) -> Optional[Dict[str, Any]]:
        """按菜品名查找食方"""
        for recipe in self.get_recipes():
            if recipe.get("dish_name") == dish_name:
                return recipe
        return None

    def get_techniques_by_category(self, category: str) -> List[Dict[str, Any]]:
        """按分类获取技法"""
        return [t for t in self.get_nodes_by_type("technique")
                if t.get("category") == category]

    def get_intangible_heritage_techniques(self) -> List[Dict[str, Any]]:
        """获取所有非遗技艺"""
        return [t for t in self.get_nodes_by_type("technique")
                if t.get("is_intangible_heritage")]


# 全局实例
_kg_instance: Optional[KnowledgeGraph] = None


def get_knowledge_graph() -> KnowledgeGraph:
    """获取知识图谱单例"""
    global _kg_instance
    if _kg_instance is None:
        _kg_instance = KnowledgeGraph()
    return _kg_instance
