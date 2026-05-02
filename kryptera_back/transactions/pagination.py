"""Pagination for transaction admin list — minimum page size 10."""

from rest_framework.pagination import PageNumberPagination


class AdminTransactionPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100
