# Copyright (c) 2025, Nguyet Hang and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class PlacementQuestion(Document):
    # begin: auto-generated types
    # This code is auto-generated. Do not modify anything in this block.

    from typing import TYPE_CHECKING

    if TYPE_CHECKING:
        from elearning.elearning.doctype.placement_question_option.placement_question_option import (
            PlacementQuestionOption,
        )
        from frappe.types import DF

        content: DF.Text
        difficulty: DF.Float
        discrimination: DF.Float
        guessing_probability: DF.Float
        options: DF.Table[PlacementQuestionOption]
        topic: DF.Link
    # end: auto-generated types

    pass
