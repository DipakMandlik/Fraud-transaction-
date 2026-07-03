"""Static reference data used to generate realistic Indian banking demo data."""

INDIAN_CITIES = [
    {"city": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lon": 72.8777},
    {"city": "Delhi", "state": "Delhi", "lat": 28.7041, "lon": 77.1025},
    {"city": "Bengaluru", "state": "Karnataka", "lat": 12.9716, "lon": 77.5946},
    {"city": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lon": 78.4867},
    {"city": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707},
    {"city": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lon": 88.3639},
    {"city": "Pune", "state": "Maharashtra", "lat": 18.5204, "lon": 73.8567},
    {"city": "Ahmedabad", "state": "Gujarat", "lat": 23.0225, "lon": 72.5714},
    {"city": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lon": 75.7873},
    {"city": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8467, "lon": 80.9462},
    {"city": "Surat", "state": "Gujarat", "lat": 21.1702, "lon": 72.8311},
    {"city": "Chandigarh", "state": "Chandigarh", "lat": 30.7333, "lon": 76.7794},
    {"city": "Kochi", "state": "Kerala", "lat": 9.9312, "lon": 76.2673},
    {"city": "Indore", "state": "Madhya Pradesh", "lat": 22.7196, "lon": 75.8577},
    {"city": "Nagpur", "state": "Maharashtra", "lat": 21.1458, "lon": 79.0882},
]

FOREIGN_HIGH_RISK_LOCATIONS = [
    {"city": "Lagos", "country": "Nigeria", "iso": "NGA", "lat": 6.5244, "lon": 3.3792},
    {"city": "Moscow", "country": "Russia", "iso": "RUS", "lat": 55.7558, "lon": 37.6173},
    {"city": "Pyongyang", "country": "North Korea", "iso": "PRK", "lat": 39.0392, "lon": 125.7625},
    {"city": "Karachi", "country": "Pakistan", "iso": "PAK", "lat": 24.8607, "lon": 67.0011},
    {"city": "Manila", "country": "Philippines", "iso": "PHL", "lat": 14.5995, "lon": 120.9842},
    {"city": "Kyiv", "country": "Ukraine", "iso": "UKR", "lat": 50.4501, "lon": 30.5234},
]

BENIGN_FOREIGN_LOCATIONS = [
    {"city": "Singapore", "country": "Singapore", "iso": "SGP", "lat": 1.3521, "lon": 103.8198},
    {"city": "Dubai", "country": "UAE", "iso": "ARE", "lat": 25.2048, "lon": 55.2708},
    {"city": "London", "country": "United Kingdom", "iso": "GBR", "lat": 51.5074, "lon": -0.1278},
    {"city": "New York", "country": "United States", "iso": "USA", "lat": 40.7128, "lon": -74.0060},
]

INDIAN_BANKS = [
    ("State Bank of India", "SBIN"),
    ("HDFC Bank", "HDFC"),
    ("ICICI Bank", "ICIC"),
    ("Axis Bank", "UTIB"),
    ("Punjab National Bank", "PUNB"),
    ("Kotak Mahindra Bank", "KKBK"),
    ("Bank of Baroda", "BARB"),
    ("Canara Bank", "CNRB"),
    ("Union Bank of India", "UBIN"),
    ("IndusInd Bank", "INDB"),
]

MERCHANT_CATALOG = [
    {"name": "Flipkart", "category": "E-Commerce"},
    {"name": "Amazon India", "category": "E-Commerce"},
    {"name": "Swiggy", "category": "Food Delivery"},
    {"name": "Zomato", "category": "Food Delivery"},
    {"name": "BigBasket", "category": "Grocery"},
    {"name": "Reliance Digital", "category": "Electronics"},
    {"name": "Croma", "category": "Electronics"},
    {"name": "IRCTC", "category": "Travel"},
    {"name": "MakeMyTrip", "category": "Travel"},
    {"name": "Apollo Pharmacy", "category": "Pharmacy"},
    {"name": "PVR Cinemas", "category": "Entertainment"},
    {"name": "Tata CLiQ", "category": "E-Commerce"},
    {"name": "Myntra", "category": "Fashion"},
    {"name": "Decathlon", "category": "Sports"},
    {"name": "Indian Oil Petrol Pump", "category": "Fuel"},
    {"name": "BSNL Recharge", "category": "Utilities"},
    {"name": "Airtel Payments", "category": "Utilities"},
    {"name": "LIC Premium", "category": "Insurance"},
    {"name": "Star Bazaar", "category": "Grocery"},
    {"name": "Cafe Coffee Day", "category": "Food & Beverage"},
]

BLACKLISTED_MERCHANTS = [
    {"name": "QuickRich Forex Traders", "category": "Forex"},
    {"name": "CryptoMoon Exchange", "category": "Crypto"},
    {"name": "GlobalBet Casino", "category": "Gambling"},
    {"name": "InstantLoan Direct", "category": "Lending"},
]

DEVICE_OS = ["Android 14", "Android 13", "iOS 17", "iOS 16", "Windows 11", "macOS Sonoma"]

OCCUPATIONS = [
    "Software Engineer", "Doctor", "Teacher", "Chartered Accountant", "Business Owner",
    "Government Employee", "Bank Manager", "Sales Executive", "Lawyer", "Farmer",
    "Retired", "Consultant", "Architect", "Civil Engineer", "Marketing Manager",
]

INDIAN_FIRST_NAMES_MALE = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan",
    "Rohan", "Karan", "Nikhil", "Rahul", "Amit", "Suresh", "Rajesh", "Vikram", "Sanjay",
    "Anil", "Deepak", "Manoj", "Ravi", "Ajay", "Vijay", "Gaurav",
]
INDIAN_FIRST_NAMES_FEMALE = [
    "Saanvi", "Ananya", "Aadhya", "Diya", "Ira", "Myra", "Sara", "Kavya", "Priya", "Neha",
    "Pooja", "Sneha", "Anjali", "Divya", "Shreya", "Meera", "Kiran", "Deepika", "Swati",
    "Nisha", "Rekha", "Sunita", "Anita", "Kavita", "Lakshmi",
]
INDIAN_LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Kumar", "Singh", "Patel", "Reddy", "Rao", "Nair", "Iyer",
    "Menon", "Das", "Bose", "Mukherjee", "Chatterjee", "Joshi", "Desai", "Shah", "Mehta",
    "Agarwal", "Bhatt", "Kapoor", "Malhotra", "Chopra", "Pillai", "Naidu", "Yadav", "Chauhan",
]

INDIAN_RELATIONSHIPS = ["Family", "Friend", "Landlord", "Vendor", "Employer", "Self (other bank)", "Business Partner"]
