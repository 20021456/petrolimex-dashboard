import mysql from 'mysql2/promise';

// Create connection pool for better performance and connection management
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'petrolimex',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 60000, // 60 seconds
});

export async function getConnection() {
  let retries = 3;
  let lastError: any;
  
  while (retries > 0) {
    try {
      const connection = await pool.getConnection();
      return connection;
    } catch (error: any) {
      console.error(`Database connection attempt failed (${4 - retries}/3):`, error.message);
      lastError = error;
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }
  }
  
  throw new Error(`Failed to connect to database after 3 attempts: ${lastError?.message}`);
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const connection = await getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results as T;
  } finally {
    connection.release();
  }
}

// Test connection on startup
export async function testConnection() {
  try {
    await query('SELECT 1');
    console.log('✅ Database connection test successful');
    return true;
  } catch (error: any) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

