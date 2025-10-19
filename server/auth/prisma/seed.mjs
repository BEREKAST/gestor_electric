import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main(){
  const exists = await prisma.user.findFirst({ where: { email: "admin@ge.com" }});
  if (!exists){
    const admin = await prisma.user.create({
      data:{
        name:"Admin", email:"admin@ge.com",
        passwordHash: await bcrypt.hash("admin123",10),
        role:"admin", plan:"enterprise"
      }
    });
    const sellerPro = await prisma.user.create({
      data:{
        name:"Seller Pro", email:"seller@ge.com",
        passwordHash: await bcrypt.hash("seller123",10),
        role:"seller", plan:"pro"
      }
    });
    const buyer = await prisma.user.create({
      data:{
        name:"Buyer", email:"buyer@ge.com",
        passwordHash: await bcrypt.hash("buyer123",10),
        role:"buyer", plan:"free"
      }
    });
    console.log("Seed auth ->", { admin: admin.email, sellerPro: sellerPro.email, buyer: buyer.email });
  } else {
    console.log("Seed auth -> ya aplicado");
  }
}
main().finally(()=>prisma.$disconnect());
