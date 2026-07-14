import unittest

from service.restoration_engine import RestorationEngine


class RestorationEngineTest(unittest.TestCase):
    def setUp(self):
        self.engine = RestorationEngine()

    def test_crab_and_orange_fragment_restores_xieniangcheng(self):
        result = self.engine.query_and_restore(
            "橙用黄熟大者，截顶去瓤，以蟹膏肉实其内，入甑蒸熟。"
        )

        restored_names = [item.get("dish_name") for item in result.get("restorations", [])]
        self.assertIn("蟹酿橙", restored_names)

    def test_restoration_includes_auditable_citations(self):
        result = self.engine.restore_dish("dish_001")

        citations = result.get("citations", [])
        self.assertGreaterEqual(len(citations), 1)
        first = citations[0]
        self.assertEqual(result.get("dish_id"), "dish_001")
        self.assertEqual(first.get("dish_id"), "dish_001")
        self.assertEqual(first.get("dish_name"), "蟹酿橙")
        self.assertTrue(first.get("title"))
        self.assertTrue(first.get("source_url"))
        self.assertIn(first.get("evidence_type"), {"source_text", "recipe", "knowledge_graph"})
        self.assertIn("license_note", first)
        self.assertIn("copyright_note", first)
        self.assertFalse(result.get("expertReviewed"))
        self.assertTrue(result.get("verification_note"))

    def test_restoration_cites_source_text_when_no_recipe_row_exists(self):
        result = self.engine.restore_dish("dish_010")

        citations = result.get("citations", [])
        self.assertGreaterEqual(len(citations), 1)
        self.assertTrue(citations[0].get("title"))
        self.assertEqual(citations[0].get("evidence_type"), "source_text")

    def test_restoration_reports_ai_metadata_for_local_fallback(self):
        result = self.engine.restore_dish("dish_001")

        metadata = result.get("ai_metadata", {})
        self.assertEqual(metadata.get("provider"), "local-python")
        self.assertEqual(metadata.get("mode"), "local")
        self.assertFalse(metadata.get("configured"))
        self.assertIsNone(metadata.get("fallbackReason"))
        self.assertIsInstance(result.get("evidenceScore"), int)
        self.assertGreater(result.get("evidenceScore"), 0)
        self.assertLessEqual(result.get("evidenceScore"), 100)
        breakdown = result.get("evidenceBreakdown", {})
        self.assertEqual(
            {"clueMatch", "sourceMatch", "ingredientMatch", "techniqueMatch", "overallReason"},
            set(breakdown.keys()),
        )

    def test_weak_clue_does_not_default_to_first_dish(self):
        result = self.engine.query_and_restore("今天随便吃一点没有古籍食材技法的东西")

        self.assertEqual(result.get("restorations"), [])
        self.assertEqual(result.get("evidence_status"), "insufficient")
        self.assertTrue(result.get("needs_more_clues"))
        self.assertEqual(result.get("evidenceScore"), 0)
        self.assertEqual(result.get("evidenceBreakdown", {}).get("clueMatch"), 0)
        self.assertEqual(result.get("evidenceBreakdown", {}).get("sourceMatch"), 0)
        self.assertEqual(result.get("evidenceBreakdown", {}).get("ingredientMatch"), 0)
        self.assertEqual(result.get("evidenceBreakdown", {}).get("techniqueMatch"), 0)
        self.assertTrue(result.get("evidenceBreakdown", {}).get("overallReason"))


if __name__ == "__main__":
    unittest.main()
