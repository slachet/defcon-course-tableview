from flask import Flask, render_template, jsonify
import requests
from bs4 import BeautifulSoup
import re

app = Flask(__name__)

# URL to scrape
BASE_URL = "https://training.defcon.org/collections/def-con-training-las-vegas-2025?filter.v.availability=1"

def clean_cost(cost_str):
    """Clean the cost string to return only the integer part (remove commas and decimals)."""
    if not cost_str:
        return ""
    # Remove any non-numeric characters except commas and periods
    cleaned = re.sub(r'[^\d,.]', '', cost_str)
    # Remove commas and split on decimal point, taking the integer part
    cleaned = cleaned.replace(',', '')
    integer_part = cleaned.split('.')[0] if '.' in cleaned else cleaned
    return integer_part

def scrape_courses():
    try:
        # Send request to the DEF CON training page
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(BASE_URL, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # Find all course links
        course_links = []
        product_items = soup.select('.product--root a[href*="/products/"]')
        for item in product_items:
            href = item.get('href')
            full_url = f"https://training.defcon.org{href}" if href.startswith('/') else href
            course_links.append(full_url)

        courses = []
        for index, link in enumerate(course_links, 1):
            try:
                # Fetch individual course page
                course_response = requests.get(link, headers=headers)
                course_response.raise_for_status()
                course_soup = BeautifulSoup(course_response.text, 'html.parser')

                # Extract course details from the <p dir="ltr"> tag
                course_info = {}
                details_p = course_soup.find('p', dir='ltr')
                
                if details_p:
                    # Get all text content and clean it up
                    text_content = details_p.get_text(separator=' ', strip=True)
                    
                    # Extract fields using regex patterns
                    patterns = {
                        'name': r'Name of Training\s*:\s*([^\n<]+?)(?=\s*(?:Trainer\(s\)|$))',
                        'trainers': r'Trainer\(s\)\s*:\s*([^\n<]+?)(?=\s*(?:Dates|$))',
                        'dates': r'Dates\s*:\s*([^\n<]+?)(?=\s*(?:Time|$))',
                        'time': r'Time\s*:\s*([^\n<]+?)(?=\s*(?:Venue|$))',
                        'venue': r'Venue\s*:\s*([^\n<]+?)(?=\s*(?:Cost|$))',
                        'cost': r'Cost\s*:\s*\$?\s*([\d,]+(?:\.\d+)?)'  # Updated regex
                    }

                    for key, pattern in patterns.items():
                        match = re.search(pattern, text_content, re.IGNORECASE)
                        if match:
                            value = match.group(1).strip()
                            # Clean the cost field to remove commas and decimals
                            course_info[key] = clean_cost(value) if key == 'cost' else value

                # Extract difficulty level (unchanged since it's working)
                details_paragraphs = course_soup.select('p[dir="ltr"]')
                for i, p in enumerate(details_paragraphs):
                    if 'Difficulty Level:' in p.get_text():
                        next_p = details_paragraphs[i + 1] if i + 1 < len(details_paragraphs) else None
                        course_info['difficulty'] = next_p.get_text(strip=True) if next_p else ''

                # Only add courses with at least a name
                if course_info.get('name'):
                    courses.append(course_info)

            except Exception as e:
                print(f"Error scraping course {link}: {e}")
                continue

        return courses

    except Exception as e:
        print(f"Error scraping main page: {e}")
        return []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/scrape_courses', methods=['GET'])
def api_scrape_courses():
    courses = scrape_courses()
    if not courses:
        return jsonify({'error': 'No courses found or error occurred during scraping.'}), 500
    return jsonify({'courses': courses})

if __name__ == '__main__':
    app.run(debug=True)
