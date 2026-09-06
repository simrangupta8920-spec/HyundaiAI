import json
import re
import pandas as pd
from pathlib import Path

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '_', text)
    return text.strip('_')

def import_cars():
    root_dir = Path(__file__).parent.parent.parent
    excel_path = root_dir / 'Tata_Maruti_Hyundai_Car_Price_Dataset.xlsx'
    if not excel_path.exists():
        excel_path = Path('f:/AI/Tata_Maruti_Hyundai_Car_Price_Dataset.xlsx')
        
    xl = pd.ExcelFile(excel_path)
    df = xl.parse('Car Price Dataset')
    
    for col in df.select_dtypes(include=['object', 'string']).columns:
        df[col] = df[col].astype(str).str.strip()
        
    initial_rows = len(df)
    df_dedup = df.drop_duplicates().copy()
    removed_duplicates = initial_rows - len(df_dedup)
    
    vehicles = []
    for idx, row in df_dedup.iterrows():
        brand = str(row['Brand']).strip()
        model = str(row['Model']).strip()
        state = str(row['State']).strip()
        
        brand_slug = slugify(brand)
        model_slug = slugify(model)
        state_slug = slugify(state)
        
        vehicle_id = f'{brand_slug}_{model_slug}_{state_slug}'
        
        is_primary = (brand.lower() == 'hyundai')
        is_competitor = (brand.lower() in ['tata motors', 'maruti suzuki'])
        
        showroom_price = float(row['Showroom Price (Ex-Showroom, Rs Lakh)']) if pd.notna(row['Showroom Price (Ex-Showroom, Rs Lakh)']) else None
        other_charges = float(row['Other Charges (Rs Lakh, approx.)']) if pd.notna(row['Other Charges (Rs Lakh, approx.)']) else None
        
        if showroom_price is not None and other_charges is not None:
            on_road_price = round(showroom_price + other_charges, 2)
        elif showroom_price is not None:
            on_road_price = showroom_price
        else:
            on_road_price = None
            
        rating = float(row['Rating (out of 5)']) if pd.notna(row['Rating (out of 5)']) else None
        seating = int(row['Seating Capacity']) if pd.notna(row['Seating Capacity']) else None
        
        item = {
            'id': vehicle_id,
            'brand': brand,
            'model': model,
            'car_type': row['Car Type'] if pd.notna(row['Car Type']) else None,
            'seating_capacity': seating,
            'fuel_type': row['Fuel Type'] if pd.notna(row['Fuel Type']) else None,
            'showroom_price': showroom_price,
            'rating': rating,
            'state': state,
            'other_charges': other_charges,
            'on_road_price': on_road_price,
            'is_primary_brand': is_primary,
            'is_competitor': is_competitor
        }
        vehicles.append(item)
        
    data_dir = root_dir / 'data'
    data_dir.mkdir(exist_ok=True)
    
    with open(data_dir / 'vehicles.json', 'w', encoding='utf-8') as f:
        json.dump(vehicles, f, indent=2)
        
    brands_dict = {}
    for v in vehicles:
        b_name = v['brand']
        if b_name not in brands_dict:
            brands_dict[b_name] = {
                'name': b_name,
                'is_primary_brand': v['is_primary_brand'],
                'is_competitor': v['is_competitor'],
                'models': set()
            }
        brands_dict[b_name]['models'].add(v['model'])
        
    brands_list = []
    for b_name, b_info in brands_dict.items():
        brands_list.append({
            'name': b_name,
            'is_primary_brand': b_info['is_primary_brand'],
            'is_competitor': b_info['is_competitor'],
            'models_count': len(b_info['models']),
            'models': sorted(list(b_info['models']))
        })
        
    with open(data_dir / 'brands.json', 'w', encoding='utf-8') as f:
        json.dump(brands_list, f, indent=2)
        
    showrooms_data = [
      {
        'id': 'HYD-DEL-001',
        'name': 'Hyundai Connaught Place',
        'city': 'New Delhi',
        'state': 'Delhi',
        'address': 'N-1, Connaught Circus, Connaught Place, New Delhi - 110001',
        'sales_executive': 'Rajesh Kumar',
        'phone': '+91-11-4567-8900',
        'active': True,
        'primary_brand': 'Hyundai'
      },
      {
        'id': 'HYD-MUM-002',
        'name': 'Hyundai Bandra West',
        'city': 'Mumbai',
        'state': 'Maharashtra',
        'address': 'Linking Road, Bandra West, Mumbai - 400050',
        'sales_executive': 'Priya Sharma',
        'phone': '+91-22-9876-5432',
        'active': True,
        'primary_brand': 'Hyundai'
      },
      {
        'id': 'HYD-BLR-003',
        'name': 'Hyundai Indiranagar',
        'city': 'Bengaluru',
        'state': 'Karnataka',
        'address': '100 Feet Road, Indiranagar, Bengaluru - 560038',
        'sales_executive': 'Amit Singh',
        'phone': '+91-80-1234-5678',
        'active': True,
        'primary_brand': 'Hyundai'
      }
    ]
    
    with open(data_dir / 'showrooms.json', 'w', encoding='utf-8') as f:
        json.dump(showrooms_data, f, indent=2)
        
    unique_brands = df['Brand'].nunique()
    unique_models = df['Model'].nunique()
    hyundai_models = df[df['Brand'] == 'Hyundai']['Model'].nunique()
    tata_models = df[df['Brand'] == 'Tata Motors']['Model'].nunique()
    maruti_models = df[df['Brand'] == 'Maruti Suzuki']['Model'].nunique()
    unique_states = df['State'].nunique()
    missing_vals = df.isna().sum().to_dict()
    
    print('=== DATASET IMPORT SUMMARY ===')
    print(f'1. Number of unique brands: {unique_brands}')
    print(f'2. Number of unique models: {unique_models}')
    print(f'3. Number of Hyundai models: {hyundai_models}')
    print(f'4. Number of Tata models: {tata_models}')
    print(f'5. Number of Maruti models: {maruti_models}')
    print(f'6. Number of states: {unique_states}')
    print(f'7. Number of duplicate rows removed: {removed_duplicates}')
    print(f'8. Number of missing values by important column:')
    for col, count in missing_vals.items():
        print(f'   - {col}: {count}')

if __name__ == '__main__':
    import_cars()
