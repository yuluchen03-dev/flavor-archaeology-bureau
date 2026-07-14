import unittest

from service.api_wrapper import build_fusion_name


class EvolutionNamingTest(unittest.TestCase):
    def test_curated_name_for_yusangeng_and_huaiye_lengtao(self):
        self.assertEqual(build_fusion_name("玉糁羹", "槐叶冷淘"), "碧槐玉糁")
        self.assertEqual(build_fusion_name("槐叶冷淘", "玉糁羹"), "碧槐玉糁")

    def test_all_builtin_pair_names_are_concise_and_not_mechanical(self):
        dish_names = [
            "蟹酿橙",
            "槐叶冷淘",
            "玉糁羹",
            "王太守八宝豆腐",
            "驼蹄羹",
            "浑羊殁忽",
            "荷包鱼",
            "荔枝腰子",
            "莲房鱼包",
            "东坡肉",
        ]

        for index, first_name in enumerate(dish_names):
            for second_name in dish_names[index + 1:]:
                with self.subTest(first_name=first_name, second_name=second_name):
                    name = build_fusion_name(first_name, second_name)
                    self.assertTrue(name)
                    self.assertLessEqual(len(name), 6)
                    self.assertNotIn("融合", name)
                    self.assertNotIn("×", name)
                    self.assertNotEqual(name, f"{first_name}{second_name}")
                    self.assertNotEqual(name, f"{second_name}{first_name}")


if __name__ == "__main__":
    unittest.main()
