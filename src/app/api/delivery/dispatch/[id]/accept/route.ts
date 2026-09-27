import { NextResponse } from "next/server";

import { AuthorizationService } from "@/core/authorization/authorization.service";
import { Permissions } from "@/core/authorization/permissions.catalog";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { dispatchAdapter } from "@/dispatch-engine/dispatch.adapter";

function getToken(request: Request): string | null {
  return request.headers.get("cookie")
    ?.match(/(?:^|;\s*)marka_session=([^;]+)/)?.[1] ?? null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token=getToken(request);
    if(!token) return NextResponse.json({message:"Authentication required.",code:"AUTHENTICATION_REQUIRED"},{status:401});
    const session=await new SessionService().validate(token);
    if(!session) return NextResponse.json({message:"Invalid or expired session.",code:"INVALID_SESSION"},{status:401});

    const {id}=await context.params;
    if(!id) return NextResponse.json({message:"Dispatch request is required.",code:"DISPATCH_REQUEST_REQUIRED"},{status:400});

    const agent=await prisma.deliveryAgent.findFirst({
      where:{userId:session.userId},
      select:{id:true,organizationId:true},
    });
    if(!agent) return NextResponse.json({message:"Delivery agent not found.",code:"DELIVERY_AGENT_NOT_FOUND"},{status:404});

    const authorization=new AuthorizationService();
    if(!(await authorization.hasPermission(session.userId,Permissions.DELIVERY_AGENT_OPERATE,agent.organizationId))){
      return NextResponse.json({message:"You do not have permission to operate as a delivery agent.",code:"DELIVERY_AGENT_OPERATION_FORBIDDEN"},{status:403});
    }

    const dispatch=await prisma.dispatchRequest.findFirst({
      where:{id,organizationId:agent.organizationId,serviceType:"DELIVERY"},
      select:{id:true},
    });
    if(!dispatch) return NextResponse.json({message:"Delivery dispatch not found.",code:"DISPATCH_NOT_FOUND"},{status:404});

    const accepted=await dispatchAdapter.accept(id,agent.id);
    return NextResponse.json({dispatch:accepted});
  }catch(error){
    const code=error instanceof Error?error.message:"DELIVERY_DISPATCH_ACCEPT_FAILED";
    const status=code.includes("cannot be accepted")||code.includes("not available")||code.includes("not an active")?409:500;
    return NextResponse.json({message:"Unable to accept delivery dispatch.",code},{status});
  }
}
