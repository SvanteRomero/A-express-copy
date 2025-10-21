from django.shortcuts import render

# Create your views here.
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum
from financials.models import Payment
from datetime import timedelta

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def revenue_overview(request):
    """
    Calculate revenue for this month and today, with comparisons to the previous period.
    """
    now = timezone.now()
    today = now.date()

    # This month's revenue
    this_month_start = today.replace(day=1)
    this_month_revenue = Payment.objects.filter(
        date__gte=this_month_start
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Last month's revenue
    last_month_end = this_month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)
    last_month_revenue = Payment.objects.filter(
        date__gte=last_month_start,
        date__lt=this_month_start
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Today's revenue
    today_revenue = Payment.objects.filter(
        date=today
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Yesterday's revenue
    yesterday = today - timedelta(days=1)
    yesterday_revenue = Payment.objects.filter(
        date=yesterday
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Percentage changes
    month_over_month_change = ((this_month_revenue - last_month_revenue) / last_month_revenue * 100) if last_month_revenue else 100
    day_over_day_change = ((today_revenue - yesterday_revenue) / yesterday_revenue * 100) if yesterday_revenue else 100

    return Response({
        'this_month_revenue': this_month_revenue,
        'month_over_month_change': month_over_month_change,
        'today_revenue': today_revenue,
        'day_over_day_change': day_over_day_change,
    })