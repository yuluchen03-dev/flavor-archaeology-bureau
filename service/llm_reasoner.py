"""
LLM多步推理引擎
使用豆包(Doubao) API进行多步推理，实现从古籍文本到完整复原方案的真·推理流程
"""
import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional


class LLMReasoner:
    """基于LLM的多步推理复原引擎"""

    def __init__(self, api_key: str = None, base_url: str = None, model: str = None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.base_url = base_url or os.environ.get(
            "OPENAI_BASE_URL",
            "https://ark.cn-beijing.volces.com/api/v3"
        )
        self.model = model or os.environ.get("MODEL_NAME", "doubao-pro-32k")
        self._available = bool(self.api_key)

    @property
    def is_available(self) -> bool:
        return self._available

    def _call_llm(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> Optional[str]:
        """调用LLM API"""
        if not self.is_available:
            return None

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": temperature,
            "max_tokens": 4096
        }

        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=60) as response:
                if response.status == 200:
                    result = json.loads(response.read().decode("utf-8"))
                    return result["choices"][0]["message"]["content"]
            return None
        except Exception:
            return None

    def reason_restoration(self, text: str, knowledge_context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        多步推理复原主流程
        返回结构化JSON，失败时返回None（调用方回退到规则匹配）
        """
        if not self.is_available:
            return None

        system_prompt = """你是一位中国古代饮食文化专家和烹饪大师。你的任务是根据古籍文本和知识图谱信息，通过多步推理来复原一道古代菜品。

请严格按以下四个步骤进行推理，每一步都要给出分析结果：

Step 1 - 文本解析：从古籍文本中提取菜品名称、食材、烹饪技法、朝代信息。
Step 2 - 时代验证：根据朝代信息，验证所列食材和技法在该时代是否可用，排除穿越元素。
Step 3 - 技法转换：将古代技法翻译为现代厨房可操作的具体步骤。
Step 4 - 复原方案：生成完整的现代复原方案，包括食材替代建议、详细步骤、文化注释。

最终输出必须是合法的JSON格式，包含以下字段：
{
  "dish_name": "菜品名称",
  "dynasty": "朝代",
  "original_text_summary": "古籍原文概述",
  "step1_parsing": {
    "extracted_name": "",
    "extracted_ingredients": [{"name": "", "role": ""}],
    "extracted_techniques": [],
    "extracted_dynasty": ""
  },
  "step2_verification": {
    "era_available": [{"name": "", "verified": true, "notes": ""}],
    "era_questionable": [{"name": "", "reason": ""}]
  },
  "step3_technique_conversion": [
    {"ancient_technique": "", "modern_equivalent": "", "detailed_steps": []}
  ],
  "step4_restoration_plan": {
    "ingredients": [
      {"name": "", "original": "", "substitute": "", "substitute_reason": ""}
    ],
    "cooking_steps": [
      {"step": 1, "action": "", "detail": "", "time": ""}
    ],
    "cultural_notes": "",
    "modern_adaptation": "",
    "difficulty": "",
    "cooking_time": "",
    "servings": 1,
    "taste_profile": ""
  }
}

请务必输出完整的JSON，不要省略任何字段。"""

        user_prompt = f"""以下是古籍文本和知识图谱上下文，请进行多步推理复原。

【古籍文本】
{text}

【知识图谱上下文】
{json.dumps(knowledge_context, ensure_ascii=False, indent=2)}

请严格按照四个步骤推理，输出完整JSON。"""

        result = self._call_llm(system_prompt, user_prompt, temperature=0.5)
        if not result:
            return None

        try:
            # 尝试解析JSON，处理可能的markdown包裹
            result = result.strip()
            if result.startswith("```"):
                lines = result.split("\n")
                result = "\n".join(lines[1:-1])
            return json.loads(result)
        except json.JSONDecodeError:
            return None

    def reason_evolution(self, dish1: Dict[str, Any], dish2: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """风味进化 - LLM推理融合两个菜品"""
        if not self.is_available:
            return None

        system_prompt = """你是融合菜创意大师，擅长将不同时代的菜品精髓融合创新。
请分析两道古代菜品的特点，创造出一道跨时代的融合菜品。

命名必须遵守：
1. new_name 使用2到6个汉字，古风、顺口、像一道真实菜名。
2. new_name 必须同时借用两道来源菜的食材、风味、器物或技法意象。
3. 禁止出现“融合”“×”“拼”“新式”等机械词。
4. 禁止把两个来源菜全名直接粘在一起，例如“甲菜乙菜融合”。

输出JSON格式：
{
  "new_name": "2到6字古风新菜名",
  "concept": "融合理念说明",
  "fusion_techniques": ["融合技法1"],
  "ingredients": [{"name": "", "origin": "dish1/dish2/both", "role": ""}],
  "cooking_steps": [{"step": 1, "action": ""}],
  "taste_evolution": "风味演变说明",
  "cultural_significance": "文化融合意义"
}"""

        user_prompt = f"""请将以下两道菜品进行创意融合：

菜品一：{json.dumps(dish1, ensure_ascii=False)}
菜品二：{json.dumps(dish2, ensure_ascii=False)}

请创造一道有意义的融合菜品，输出JSON。"""

        result = self._call_llm(system_prompt, user_prompt, temperature=0.8)
        if not result:
            return None

        try:
            result = result.strip()
            if result.startswith("```"):
                lines = result.split("\n")
                result = "\n".join(lines[1:-1])
            return json.loads(result)
        except json.JSONDecodeError:
            return None

    def reason_teach(self, dish_info: Dict[str, Any], question: str) -> Optional[Dict[str, Any]]:
        """数字传承人 - LLM教学对话"""
        if not self.is_available:
            return None

        system_prompt = """你是一位热情的中国古代饮食文化传承人。用户向你请教一道古代菜品的问题。
请用亲切、专业的口吻回答，包含历史文化背景和实用烹饪知识。

输出JSON格式：
{
  "answer": "详细回答",
  "tips": ["实用小贴士1", "实用小贴士2"],
  "historical_fact": "一条有趣的历史冷知识",
  "suggestions": ["推荐追问1", "推荐追问2", "推荐追问3"]
}"""

        user_prompt = f"""关于这道菜品：
{json.dumps(dish_info, ensure_ascii=False)}

用户的问题是：{question}

请给出专业、亲切的回答。输出JSON。"""

        result = self._call_llm(system_prompt, user_prompt, temperature=0.7)
        if not result:
            return None

        try:
            result = result.strip()
            if result.startswith("```"):
                lines = result.split("\n")
                result = "\n".join(lines[1:-1])
            return json.loads(result)
        except json.JSONDecodeError:
            return None

    def analyze_text(self, text: str) -> Optional[Dict[str, Any]]:
        """使用LLM分析古籍文本，提取线索（替代关键词匹配）"""
        if not self.is_available:
            return None

        system_prompt = """你是古籍文本分析专家。请从给定的古籍片段中提取关键信息。

输出JSON格式：
{
  "dishes": [{"name": "", "confidence": 0.0-1.0}],
  "ingredients": [{"name": "", "role": "", "confidence": 0.0-1.0}],
  "techniques": [{"name": "", "description": ""}],
  "dynasties": [{"name": "", "evidence": ""}],
  "regions": [{"name": "", "evidence": ""}],
  "summary": "文本内容概述",
  "cultural_context": "文化背景分析"
}"""

        user_prompt = f"请分析以下古籍文本：\n\n{text}\n\n请提取所有关键信息，输出JSON。"

        result = self._call_llm(system_prompt, user_prompt, temperature=0.3)
        if not result:
            return None

        try:
            result = result.strip()
            if result.startswith("```"):
                lines = result.split("\n")
                result = "\n".join(lines[1:-1])
            return json.loads(result)
        except json.JSONDecodeError:
            return None


# 全局实例
_llm_instance: Optional[LLMReasoner] = None


def get_llm_reasoner() -> LLMReasoner:
    """获取LLM推理引擎单例"""
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = LLMReasoner()
    return _llm_instance
