# Brand Controller API Documentation

## Overview
The Brand Controller provides **GET-only** endpoints for retrieving brand information from the database. All endpoints are public and don't require authentication.

## Base URL
```
http://localhost:9000/api/brands
```

---

## Endpoints

### 1. Get All Brands
Retrieve a list of all unique brands in the database.

**Endpoint:** `GET /api/brands`

**Query Parameters:**
- `category` (optional): Filter brands by category
  - Values: `watches`, `bags`, `handbags`, `accessories`, or any custom category

**Example Requests:**
```bash
# Get all brands
GET http://localhost:9000/api/brands

# Get brands for watches only
GET http://localhost:9000/api/brands?category=watches

# Get brands for bags only
GET http://localhost:9000/api/brands?category=bags

# Get brands for accessories only
GET http://localhost:9000/api/brands?category=accessories
```

**Example Response:**
```json
{
  "success": true,
  "totalBrands": 150,
  "brands": [
    "Aigner",
    "Audemars Piguet",
    "Balenciaga",
    "Breitling",
    "Cartier",
    "Gucci",
    "Rolex",
    ...
  ],
  "category": "watches"
}
```

---

### 2. Get Brand Details
Get detailed information about a specific brand including product counts.

**Endpoint:** `GET /api/brands/:brandName`

**Path Parameters:**
- `brandName` (required): The name of the brand

**Query Parameters:**
- `category` (optional): Filter by category

**Example Requests:**
```bash
# Get Rolex brand details
GET http://localhost:9000/api/brands/rolex

# Get Rolex watches specifically
GET http://localhost:9000/api/brands/rolex?category=watches

# Get Gucci bags
GET http://localhost:9000/api/brands/gucci?category=bags
```

**Example Response:**
```json
{
  "success": true,
  "brand": "Rolex",
  "totalProducts": 45,
  "availableProducts": 32,
  "categories": ["Watch"],
  "filterCategory": "watches"
}
```

---

### 3. Get Brands with Statistics
Retrieve all brands with detailed statistics including product counts and availability.

**Endpoint:** `GET /api/brands/stats`

**Query Parameters:**
- `category` (optional): Filter brands by category

**Example Requests:**
```bash
# Get all brands with stats
GET http://localhost:9000/api/brands/stats

# Get watch brands with stats
GET http://localhost:9000/api/brands/stats?category=watches
```

**Example Response:**
```json
{
  "success": true,
  "totalBrands": 150,
  "brands": [
    {
      "brand": "Rolex",
      "totalProducts": 45,
      "availableProducts": 32,
      "categories": ["Watch"]
    },
    {
      "brand": "Gucci",
      "totalProducts": 78,
      "availableProducts": 56,
      "categories": ["Watch", "Leather Bags", "Accessories"]
    },
    ...
  ],
  "category": "all"
}
```

---

### 4. Get Available Brands
Get only brands that have at least one product in stock.

**Endpoint:** `GET /api/brands/available`

**Query Parameters:**
- `category` (optional): Filter brands by category

**Example Requests:**
```bash
# Get all available brands
GET http://localhost:9000/api/brands/available

# Get available watch brands only
GET http://localhost:9000/api/brands/available?category=watches
```

**Example Response:**
```json
{
  "success": true,
  "totalBrands": 120,
  "brands": [
    "Rolex",
    "Cartier",
    "Gucci",
    "Omega",
    ...
  ],
  "category": "watches",
  "availableOnly": true
}
```

---

## Category Filters

The following category values are supported:

| Category Value | Description |
|---------------|-------------|
| `watches` or `watch` | Watch products only |
| `bags`, `handbags`, or `leather-bags` | Bag/handbag products |
| `accessories` | Accessory products |
| Any custom value | Matches category exactly (case-insensitive) |

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Brand name is required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Brand 'BrandName' not found in category 'watches'"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Error fetching brands",
  "error": "Error details (only in development mode)"
}
```

---

## Use Cases

### Frontend Brand Filter
Use the `/api/brands/available` endpoint to populate a brand filter dropdown with only brands that have products in stock:

```javascript
// Fetch available watch brands
const response = await fetch('http://localhost:9000/api/brands/available?category=watches');
const data = await response.json();
// Use data.brands to populate dropdown
```

### Brand Page
Use the `/api/brands/:brandName` endpoint to show brand statistics on a brand page:

```javascript
// Get Rolex brand details
const response = await fetch('http://localhost:9000/api/brands/rolex?category=watches');
const data = await response.json();
// Display: "Rolex has 32 available watches out of 45 total"
```

### Admin Dashboard
Use the `/api/brands/stats` endpoint to show brand statistics in an admin dashboard:

```javascript
// Get all brands with statistics
const response = await fetch('http://localhost:9000/api/brands/stats');
const data = await response.json();
// Display table with brand names, product counts, and availability
```

---

## Notes

1. **Case Insensitive**: All brand name searches are case-insensitive
2. **Published Only**: Only published products are included in the results
3. **Normalized**: Brand names are normalized (trimmed and capitalized) in responses
4. **Sorted**: Brands are returned in alphabetical order (A-Z)
5. **Performance**: Uses MongoDB aggregation for optimal performance

---

## Testing with Postman/Thunder Client

### Test 1: Get All Brands
```
GET http://localhost:9000/api/brands
```

### Test 2: Get Watch Brands
```
GET http://localhost:9000/api/brands?category=watches
```

### Test 3: Get Rolex Details
```
GET http://localhost:9000/api/brands/rolex
```

### Test 4: Get Available Brands with Stats
```
GET http://localhost:9000/api/brands/stats?category=watches
```

### Test 5: Get Available Bag Brands
```
GET http://localhost:9000/api/brands/available?category=bags
```
