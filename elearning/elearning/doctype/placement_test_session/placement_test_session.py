# Copyright (c) 2025, Nguyet Hang and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class PlacementTestSession(Document):
    # begin: auto-generated types
    # This code is auto-generated. Do not modify anything in this block.

    from typing import TYPE_CHECKING

    if TYPE_CHECKING:
        from elearning.elearning.doctype.session_topic_ability.session_topic_ability import (
            SessionTopicAbility,
        )
        from frappe.types import DF

        end_time: DF.Datetime | None
        start_time: DF.Datetime | None
        status: DF.Literal["In Progress", "Completed"]
        student: DF.Link
        topic_abilities: DF.Table[SessionTopicAbility]
    # end: auto-generated types

    pass
