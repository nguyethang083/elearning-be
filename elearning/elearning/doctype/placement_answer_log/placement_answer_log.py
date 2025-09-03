# Copyright (c) 2025, Nguyet Hang and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class PlacementAnswerLog(Document):
    # begin: auto-generated types
    # This code is auto-generated. Do not modify anything in this block.

    from typing import TYPE_CHECKING

    if TYPE_CHECKING:
        from frappe.types import DF

        is_correct: DF.Check
        placement_question: DF.Link
        placement_test_session: DF.Link
    # end: auto-generated types

    pass
