import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main(){
  const count = await prisma.category.count();
  if (count === 0){
    await prisma.category.create({
      data:{
        name:"Medición",
        products:{ create:[{ name:"Medidor Digital", price:120.5, image:"/placeholder/medidor.jpg", stock:12 }] }
      }
    });
    await prisma.category.create({
      data:{
        name:"Transformadores",
        products:{ create:[{ name:"Transformador 5kVA", price:890, image:"/placeholder/trafo.jpg", stock:4 }] }
      }
    });
    await prisma.category.create({
      data:{
        name:"Cables",
        products:{ create:[{ name:"Cable THHN 12AWG", price:45.9, image:"/placeholder/cable.jpg", stock:0 }] }
      }
    });
    await prisma.category.create({
      data:{
        name:"Energía",
        products:{ create:[{ name:"Panel Solar 400W", price:210, image:"/placeholder/trafo.jpg", stock:20 }] }
      }
    });
    console.log("Seed catalog -> OK");
  } else {
    console.log("Seed catalog -> ya aplicado");
  }
}
main().finally(()=>prisma.$disconnect());
