# Copyright (c) 2025, Nguyet Hang and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class SessionTopicAbility(Document):
    # begin: auto-generated types
    # This code is auto-generated. Do not modify anything in this block.

    from typing import TYPE_CHECKING

    if TYPE_CHECKING:
        from frappe.types import DF

        ability_estimate: DF.Float
        parent: DF.Data
        parentfield: DF.Data
        parenttype: DF.Data
        questions_answered: DF.Int
        standard_error: DF.Float
        topic: DF.Link
    # end: auto-generated types

    pass
