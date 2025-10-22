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

    # Opening balance
    opening_balance = Payment.objects.filter(
        date__lt=today
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Today's revenue
    today_revenue = Payment.objects.filter(
        date=today,
        amount__gt=0
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Yesterday's revenue
    yesterday = today - timedelta(days=1)
    yesterday_revenue = Payment.objects.filter(
        date=yesterday,
        amount__gt=0
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Today's expenditure
    today_expenditure = Payment.objects.filter(
        date=today,
        amount__lt=0
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Yesterday's expenditure
    yesterday_expenditure = Payment.objects.filter(
        date=yesterday,
        amount__lt=0
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Percentage changes
    day_over_day_change = ((today_revenue - yesterday_revenue) / yesterday_revenue * 100) if yesterday_revenue else 100
    expenditure_day_over_day_change = ((today_expenditure - yesterday_expenditure) / yesterday_expenditure * 100) if yesterday_expenditure else 100

    return Response({
        'opening_balance': opening_balance,
        'today_revenue': today_revenue,
        'day_over_day_change': day_over_day_change,
        'today_expenditure': abs(today_expenditure),
        'expenditure_day_over_day_change': expenditure_day_over_day_change,
    })