import { NextResponse } from "next/server";
import { getDistinctGroups } from "@/lib/localDb";

export async function GET() {
  try {
    const groups = await getDistinctGroups();
    return NextResponse.json({ groups });
  } catch (error) {
    console.log("Error fetching distinct groups:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}
