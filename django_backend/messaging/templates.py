"""
Message template constants and retrieval functions.
Centralizes all template management for SMS messages.
"""

# Default message templates (Hardcoded)
DEFAULT_MESSAGE_TEMPLATES = [
    {
        'key': 'in_progress',
        'name': 'Repair in Progress',
        'content': (
            "Habari {customer}, kifaa chako cha {device} kilisajiliwa kwenye mfumo wetu "
            "(Job No.: {taskId}). Baada ya uchunguzi, tatizo ni {DESCRIPTION}, "
            "na mafundi wanaendelea na matengenezo. Tunaomba uwe na subira, "
            "na tutakutaarifu pindi kazi itakapokamilika.{contact_info} – {company_name}."
        ),
        'is_default': True
    },
    {
        'key': 'ready_for_pickup',
        'name': 'Ready for Pickup',
        'content': (
            "Habari {customer}, kifaa chako {device} (Job No.: {taskId}) {status}. "
            "Tatizo: {DESCRIPTION}. Gharama: TSH {amount}. "
            "Tafadhali chukua ndani ya siku 7.{contact_info} – {company_name}."
        ),
        'is_default': True
    },
    {
        'key': 'debt_reminder',
        'name': 'Remind Debt',
        'content': (
            "Habari {customer}, tunakumbusha kuwa unadaiwa deni la TSH {outstanding_balance} "
            "kwa kazi ya {device} (Job No.: {taskId}). Tafadhali lipa mapema iwezekanavyo "
            "ili kuepuka usumbufu.{contact_info} Asante kwa kushirikiana na {company_name}."
        ),
        'is_default': True
    }
]

# Ready for pickup templates (Solved/Not Solved variants)
TEMPLATE_READY_SOLVED = (
    "Habari {customer}, kifaa chako {device} imeyosajiliwa kwenye mfumo wetu (Job No.: {taskId}). "
    "Kompyuta yako imefanyiwa kazi, IMEPONA na ipo tayari kuchukuliwa, na gharama yake ni TSH {amount}. "
    "Unatakiwa kuichukua ndani ya siku 7 kuanzia leo; baada ya hapo, utatozwa gharama za uhifadhi TSH 3,000/siku. "
    "Asante kwa kushirikiana,{contact_info} – {company_name}."
)

TEMPLATE_READY_NOT_SOLVED = (
    "Habari {customer}, kifaa chako {device} imeyosajiliwa kwenye mfumo wetu (Job No.: {taskId}). "
    "Kompyuta yako imefanyiwa kazi, HAIJAPONA na ipo tayari kuchukuliwa. "
    "Unatakiwa kuichukua ndani ya siku 7 kuanzia leo; baada ya hapo, utatozwa gharama za uhifadhi TSH 3,000/siku. "
    "Asante kwa kushirikiana,{contact_info} – {company_name}."
)

# Picked Up SMS templates
TEMPLATE_PICKED_UP_THANK_YOU = (
    "Habari {customer}, tunakushukuru kwa kuchukua kompyuta yako {device} "
    "(Job No.: {taskId}). Tunafurahi kufanya kazi na wewe. Karibu sana! – {company_name}"
)

TEMPLATE_PICKED_UP_DEBT = (
    "Habari {customer}, tunakumbusha kuwa unadaiwa deni la TSH {outstanding_balance} "
    "kwa kazi ya {device} (Job No.: {taskId}). Tafadhali lipa mapema iwezekanavyo "
    "ili kuepuka usumbufu. Asante kwa kushirikiana na {company_name}"
)

# Pickup Reminder template (for tasks ready but not picked up)
TEMPLATE_PICKUP_REMINDER = (
    "Habari {customer}, tunakukumbusha kuwa kifaa chako {device} "
    "(Job No.: {taskId}) kipo tayari kuchukuliwa. "
    "Umebakiwa na saa {hours_remaining} kabla ya muda wa siku 7 kumalizika; "
    "baada ya hapo, gharama ya uhifadhi TSH 3,000/siku itatozwa."
    "{contact_info} – {company_name}."
)


def get_message_templates():
    """
    Get all message templates (defaults + database).
    """
    from messaging.models import MessageTemplate
    
    # Start with defaults
    templates = [t.copy() for t in DEFAULT_MESSAGE_TEMPLATES]
    
    # Add database templates
    db_templates = MessageTemplate.objects.filter(is_active=True)
    for t in db_templates:
        templates.append({
            'id': t.id,
            'name': t.name,
            'content': t.content,
            'is_default': False
        })
        
    return templates


def get_template_by_key_or_id(key=None, template_id=None):
    """
    Get a template content by either its string key (default) or DB ID.
    """
    from messaging.models import MessageTemplate
    
    if key:
        for t in DEFAULT_MESSAGE_TEMPLATES:
            if t['key'] == key:
                return t['content']
    
    if template_id:
        try:
            return MessageTemplate.objects.get(id=template_id).content
        except MessageTemplate.DoesNotExist:
            pass
            
    return None
