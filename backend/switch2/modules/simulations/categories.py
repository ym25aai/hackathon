from .schemas import CatalogItem

CATEGORIES: list[CatalogItem] = [
    CatalogItem(id="self", title="SELF", description="Personal development, habits, goals and self-management."),
    CatalogItem(id="education", title="EDUCATION", description="Learning, examinations and academic decisions."),
    CatalogItem(id="career", title="CAREER", description="Employment, leadership, teamwork and professional decisions."),
    CatalogItem(id="relationships", title="RELATIONSHIPS", description="Trust, communication, friendship, family and romance."),
    CatalogItem(id="finance", title="FINANCE", description="Budgeting, saving and financial decisions."),
    CatalogItem(id="ethics", title="ETHICS", description="Fairness, honesty, responsibility and moral dilemmas."),
    CatalogItem(id="health", title="HEALTH", description="Lifestyle, exercise, sleep and stress management."),
    CatalogItem(id="crisis", title="CRISIS", description="Emergencies, unexpected events and urgent decisions."),
]
