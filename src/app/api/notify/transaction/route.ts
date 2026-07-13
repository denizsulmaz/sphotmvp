import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { sendNotificationEmail } from "@/lib/notify";

/**
 * Secure API route to send transactional email notifications from authenticated client actions.
 * Verifies the caller's session token using Supabase Auth.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_token, type, details } = body;

    if (!access_token || !type || !details) {
      return NextResponse.json(
        { error: "access_token, type, and details are required." },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();

    // Verify caller session using the token
    const { data: userData, error: authErr } = await supabase.auth.getUser(access_token);
    if (authErr || !userData.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }
    const user = userData.user;

    let subject = "";
    let htmlContent = "";
    let textContent = "";

    if (type === "photographer_signup") {
      subject = `[SPHOT] New Photographer Application Submitted: ${details.fullName}`;
      textContent = `A new photographer has signed up and submitted their application.\nName: ${details.fullName}\nEmail: ${user.email}\nInstagram: ${details.instagram || "None"}\nBase Price: ${details.basePrice || "Not set"}`;
      htmlContent = `
        <h2>New SPHOT Photographer Application</h2>
        <p><strong>Name:</strong> ${details.fullName}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Instagram:</strong> ${details.instagram || "None"}</p>
        <p><strong>Base Price:</strong> ${details.basePrice || "Not set"} KRW/hr</p>
        <p><strong>Portfolio URL:</strong> ${details.portfolioLink || "None"}</p>
        <p><strong>Primary Location:</strong> ${details.location || "None"}</p>
        <hr/>
        <p><em>SPHOT Alerts System</em></p>
      `;
    } else if (type === "photographer_onboarding") {
      subject = `[SPHOT] Photographer Onboarding Completed: ${details.fullName}`;
      textContent = `Photographer ${details.fullName} has successfully completed their onboarding steps.\nEmail: ${user.email}\nBio: ${details.bio}\nBase Price: ${details.basePrice} KRW/hr`;
      htmlContent = `
        <h2>Photographer Onboarding Completed</h2>
        <p><strong>Name:</strong> ${details.fullName}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Base Price:</strong> ${details.basePrice} KRW/hr</p>
        <p><strong>Selected Locations:</strong> ${(details.locations || []).join(", ")}</p>
        <p><strong>Selected Categories:</strong> ${(details.categories || []).join(", ")}</p>
        <p><strong>Languages:</strong> ${(details.languages || []).join(", ")}</p>
        <p><strong>Short Bio:</strong> ${details.bio || "None"}</p>
        <hr/>
        <p><em>SPHOT Alerts System</em></p>
      `;
    } else if (type === "photographer_availability") {
      subject = `[SPHOT] Photographer Availability Updated: ${details.fullName}`;
      textContent = `Photographer ${details.fullName} has updated their availability slots.\nEmail: ${user.email}\nAction: ${details.action}\nDetails: ${details.slotsDescription}`;
      htmlContent = `
        <h2>Photographer Availability Updated</h2>
        <p><strong>Name:</strong> ${details.fullName}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Action:</strong> ${details.action}</p>
        <p><strong>Details:</strong> ${details.slotsDescription}</p>
        <hr/>
        <p><em>SPHOT Alerts System</em></p>
      `;
    } else {
      return NextResponse.json({ error: "Invalid notification type." }, { status: 400 });
    }

    await sendNotificationEmail(subject, htmlContent, textContent);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[api/notify/transaction] Error:", err.message || err);
    return NextResponse.json({ error: err.message || "Failed to send notification." }, { status: 500 });
  }
}
