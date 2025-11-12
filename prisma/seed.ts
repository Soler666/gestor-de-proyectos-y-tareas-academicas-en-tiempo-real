import { PrismaClient } from '../src/generated/prisma';
import hashPassword from '../src/util/bcrypt/hashpassword';

const prisma = new PrismaClient();

async function main() {
  // Crear usuario administrador por defecto
  const hashedPassword = await hashPassword('admin123');

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@sistemaeducativo.com',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'APPROVED',
      firstName: 'Administrador',
      lastName: 'Sistema',
      profileComplete: true,
    },
  });

  console.log('Usuario administrador creado:', admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
