#!/bin/bash
# Script để test MySQL connection trong Docker

echo "🔍 Testing MySQL Connection..."
echo ""

# Get container name
MYSQL_CONTAINER=$(docker ps --filter "name=mysql" --format "{{.Names}}" | head -1)
DASHBOARD_CONTAINER=$(docker ps --filter "name=dashboard" --format "{{.Names}}" | head -1)

if [ -z "$MYSQL_CONTAINER" ]; then
    echo "❌ MySQL container not found"
    exit 1
fi

if [ -z "$DASHBOARD_CONTAINER" ]; then
    echo "❌ Dashboard container not found"
    exit 1
fi

echo "📦 Found containers:"
echo "   MySQL: $MYSQL_CONTAINER"
echo "   Dashboard: $DASHBOARD_CONTAINER"
echo ""

# Test 1: Check if MySQL is running
echo "1️⃣ Check MySQL status..."
docker exec $MYSQL_CONTAINER mysqladmin ping -uroot -pminhtrung02
if [ $? -eq 0 ]; then
    echo "✅ MySQL is responding"
else
    echo "❌ MySQL is not responding"
fi
echo ""

# Test 2: Check databases
echo "2️⃣ Check databases..."
docker exec $MYSQL_CONTAINER mysql -uroot -pminhtrung02 -e "SHOW DATABASES;"
echo ""

# Test 3: Check petrolimex database
echo "3️⃣ Check petrolimex database tables..."
docker exec $MYSQL_CONTAINER mysql -uroot -pminhtrung02 petrolimex -e "SHOW TABLES;"
echo ""

# Test 4: Check connection from dashboard container
echo "4️⃣ Test connection from dashboard container..."
docker exec $DASHBOARD_CONTAINER mysql -hmysql -uroot -pminhtrung02 -e "SELECT 1;"
if [ $? -eq 0 ]; then
    echo "✅ Dashboard can connect to MySQL"
else
    echo "❌ Dashboard cannot connect to MySQL"
fi
echo ""

# Test 5: Check environment variables
echo "5️⃣ Check dashboard environment variables..."
docker exec $DASHBOARD_CONTAINER env | grep -E "(DB_HOST|DB_USER|DB_PASSWORD|DB_NAME)"
echo ""

# Test 6: Check network connectivity
echo "6️⃣ Check network connectivity..."
docker exec $DASHBOARD_CONTAINER ping -c 2 mysql
echo ""

echo "✅ Test completed!"

