import json

from flask import g
from flask_appbuilder import expose, has_access
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_babel import lazy_gettext as _

from superset.constants import MODEL_VIEW_RW_METHOD_PERMISSION_MAP, RouteMethod
from superset.models.slice import Slice
from superset.typing import FlaskResponse
from superset.views.base import (
    DeleteMixin,
    SupersetModelView,
)
from superset.views.chart.mixin import SliceMixin

class SelfWebModelView(
    SliceMixin, SupersetModelView, DeleteMixin
):  # pylint: disable=too-many-ancestors

    datamodel = SQLAInterface(Slice)
    class_permission_name = "Chart"
    method_permission_name = MODEL_VIEW_RW_METHOD_PERMISSION_MAP

    route_base = "/web"
    @expose("/list/")
    @has_access
    def list(self) -> FlaskResponse:
        return super().render_app_template()