import unittest

from service.api_wrapper import analyze, restore, teach, evolution, star_map


class ApiWrapperTest(unittest.TestCase):
    def test_analyze_restores_crab_stuffed_orange_fragment(self):
        result = analyze({
            "text": "橙用黄熟大者，截顶去瓤，以蟹膏肉实其内，入甑蒸熟。"
        })

        restored_names = [item.get("dish_name") for item in result.get("restorations", [])]
        self.assertIn("蟹酿橙", restored_names)

    def test_restore_teach_evolution_and_star_map_contracts(self):
        restored = restore({"dish_id": "dish_001"})
        taught = teach({"dish_id": "dish_001", "question": "为什么非得用橙？"})
        evolved = evolution({"dish_id_1": "dish_001", "dish_id_2": "dish_002"})
        map_data = star_map({})

        self.assertEqual(restored.get("dish_name"), "蟹酿橙")
        self.assertGreaterEqual(len(restored.get("steps", [])), 4)
        self.assertEqual(taught.get("dish_name"), "蟹酿橙")
        self.assertGreater(len(taught.get("answer", "")), 20)
        self.assertIn("new_dish", evolved)
        self.assertEqual(len(evolved.get("source_dishes", [])), 2)
        self.assertGreaterEqual(len(map_data.get("dishes", [])), 10)
        self.assertGreater(len(map_data.get("connections", [])), 0)


if __name__ == "__main__":
    unittest.main()
