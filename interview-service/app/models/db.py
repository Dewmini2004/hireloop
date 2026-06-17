import os, asyncpg
_pool = None
async def get_pool():
    global _pool
    if not _pool:
        _pool = await asyncpg.create_pool(os.getenv("DATABASE_URL"))
    return _pool
async def init_db():
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(255) NOT NULL,
                job_data JSONB NOT NULL,
                messages JSONB DEFAULT '[]',
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW(),
                ended_at TIMESTAMP
            );
        """)
    print("✅ Interview DB ready")
