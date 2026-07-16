import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import "dotenv/config";
import { PrismaClient } from "../../generated/prisma/client";
import { envVars } from '../config/env';

// Local MySQL — no SSL needed.
const adapter = new PrismaMariaDb({
    host: envVars.DATABASE.HOST,
    port: Number(envVars.DATABASE.PORT),
    user: envVars.DATABASE.USER,
    password: envVars.DATABASE.PASSWORD,
    database: envVars.DATABASE.NAME,
    connectTimeout: 30000,
})

const prisma = new PrismaClient({ adapter })

export { prisma };
