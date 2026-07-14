#!/usr/bin/env python3
"""
菜品图片生成服务
支持豆包文生图API / 即梦API
"""
import os
import json
import base64
import urllib.request
import urllib.error


VISUAL_SPECS = {
    "蟹酿橙": {
        "identity": "单人份橙盅菜：完整厚皮黄橙截顶挖空成高边橙壳口沿，小碗或小蒸盏托住橙盅，内部盛湿润蟹粉蟹黄蟹肉碎，内馅齐平或略低于橙盅口沿，橙盖覆回或斜靠旁边",
        "avoid": "不得出现整只螃蟹，不得出现蟹腿、蟹钳、蟹壳或完整蟹身轮廓，不能用整蟹或蟹腿说明食材来源，不要把橙片绿叶或整蟹摆成装饰盘，不要把螃蟹当主菜",
    },
    "槐叶冷淘": {
        "identity": "淡青绿色中式凉面，槐叶汁和面，面条根根可辨，过冷后以酱醋熟油轻拌，浅碗或陶盘盛放",
        "avoid": "不要做成热汤面、意大利面、绿色沙拉或整枝树叶铺盘",
    },
    "玉糁羹": {
        "identity": "浅白色萝卜米糁浓羹，白萝卜煮烂与白米糁形成温润浓稠质地，小瓷碗或汤盏盛放",
        "avoid": "不要清汤、西式奶油汤、大块生萝卜或米饭团",
    },
    "王太守八宝豆腐": {
        "identity": "白嫩豆腐碎或豆腐泥在浓鸡汁中的半流质豆腐羹，细碎菌菇、火腿屑、鸡屑、松子或瓜子仁均匀融入",
        "avoid": "不要完整豆腐块堆叠、麻婆豆腐红油菜或配料分区陈列",
    },
    "炙羊肉": {
        "identity": "带脂羊肉切成厚片或大片炙烤，边缘微焦，油脂透明发亮，表面附着茴香类香料",
        "avoid": "不要整只羊、现代烤串、生肉片或西式牛排摆盘",
    },
    "驼蹄羹": {
        "identity": "浓稠胶质肉羹，汤体琥珀色或乳白，软烂胶质肉块切成可入口小块，深碗盛放",
        "avoid": "不要出现完整骆驼脚掌、脚趾轮廓、血腥或猎奇器官形态",
    },
    "浑羊殁忽": {
        "identity": "分切后的酿羊肉大菜，熟羊肉外层包裹鹅肉或禽肉与糯米馅，切面朝上展示层次和肉汁",
        "avoid": "不要整只羊尸体、整只鹅裸露摆盘或烤全羊宴席",
    },
    "荷包鱼": {
        "identity": "去骨鱼身或鱼片包裹肉茸的闭合鱼包，形似鼓起的荷包，边缘收拢，少量清亮芡汁",
        "avoid": "不要整条未处理鱼、鱼头鱼尾主体、油炸鱼排或鱼丸汤",
    },
    "荔枝腰子": {
        "identity": "猪腰花刀爆炒后卷曲成荔枝状，每块腰花有密集刀纹并裹酸甜亮芡",
        "avoid": "不要真实荔枝水果作为主体，不要生内脏、整颗腰子或水果甜品",
    },
    "莲房鱼包": {
        "identity": "一枚莲蓬状莲房容器，多个圆孔中填满白色鱼肉馅并蒸熟，孔洞排列清晰，少量清汁",
        "avoid": "不要荷叶包饭、整条鱼摆在莲蓬旁、莲花装饰盖过主菜或寿司点心拼盘",
    },
    "东坡肉": {
        "identity": "规整酱红方块五花肉，顶部皮面亮泽，侧面肥瘦分层清楚，底部少量浓稠红烧汁",
        "avoid": "不要肉片散炒、焦黑烤肉、生肉排骨或叉烧片",
    },
}


def build_visual_constraints(dish_name):
    spec = VISUAL_SPECS.get(dish_name)
    if not spec:
        return "真实熟制中式菜品，单一主菜成品，不是食材陈列。"
    return f"菜品视觉事实：{spec['identity']}。必须避免：{spec['avoid']}。"


class ImageGenerator:
    def __init__(self, api_key=None, base_url=None):
        self.api_key = api_key or os.environ.get("IMAGE_GEN_API_KEY", "")
        self.base_url = base_url or os.environ.get("IMAGE_GEN_BASE_URL", 
            "https://ark.cn-beijing.volces.com/api/v3")
    
    def build_prompt(self, dish_name, prompt_detail, dynasty=None):
        dynasty_style = {
            "宋代": "宋式雅致美学，青白瓷器，极简留白",
            "唐代": "唐代宫廷奢华风格，金银器皿，丰盛饱满",
            "清代": "清代精致考究，粉彩瓷器，细腻典雅",
        }
        style = dynasty_style.get(dynasty, "中国传统水墨风，古雅瓷器")
        
        visual_constraints = build_visual_constraints(dish_name)

        prompt = f"""
中国传统美食摄影风格，{dish_name}，{prompt_detail}。
{visual_constraints}
{style}。高清食物摄影，自然光，俯拍视角，精美摆盘。
中景构图，背景木质案板或古风桌面，画面干净温暖。
必须是一道真实可食用、已经熟制并能上桌的单一成品菜；不要食材拼贴，不要概念海报，不要文字水印。
""".strip()
        return prompt
    
    def generate_dish_image(self, dish_name, prompt_detail, dynasty=None):
        """生成菜品复原图"""
        prompt = self.build_prompt(dish_name, prompt_detail, dynasty)
        if not self.api_key:
            return None
        
        try:
            # 使用OpenAI兼容的图片生成API
            url = f"{self.base_url}/images/generations"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            data = {
                "model": "doubao-seedream-3-0-t2i-250415",
                "prompt": prompt,
                "n": 1,
                "size": "1024x1024"
            }
            payload = json.dumps(data).encode("utf-8")
            req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=30) as response:
                if response.status == 200:
                    result = json.loads(response.read().decode("utf-8"))
                    return result.get("data", [{}])[0].get("url") or result.get("data", [{}])[0].get("b64_json")
        except Exception as e:
            print(f"Image generation failed: {e}")
        
        return None
    
    def generate_placeholder_svg(self, dish_name, color="#8C3B2E"):
        """生成SVG占位图（当API不可用时）"""
        svg = f'''<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="300" fill="#F5F0EB" rx="12"/>
  <rect x="100" y="80" width="200" height="140" rx="20" fill="{color}" opacity="0.15"/>
  <circle cx="200" cy="150" r="45" fill="{color}" opacity="0.2"/>
  <text x="200" y="250" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" 
        font-size="24" fill="{color}" font-weight="bold">{dish_name}</text>
  <text x="200" y="275" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" 
        font-size="14" fill="#9C6B2E">AI风味复原 · 成品图</text>
</svg>'''
        return f"data:image/svg+xml;base64,{base64.b64encode(svg.encode()).decode()}"


# 全局实例
_image_generator = None

def get_image_generator():
    global _image_generator
    if _image_generator is None:
        _image_generator = ImageGenerator()
    return _image_generator
