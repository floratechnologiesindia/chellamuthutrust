import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// This is a seeding function - no auth required for local/dev use
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEMO_DONORS = [
  {
    email: "ramesh.kumar@example.com",
    password: "donor123",
    name: "Ramesh Kumar",
    phone: "+91 98765 43210",
    organization: "Kumar Industries Pvt Ltd",
    donor_category: "csr",
    address: "123, Industrial Area",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600001",
    pan_number: "ABCPK1234A",
    notes: "CSR partner since 2020"
  },
  {
    email: "priya.sharma@example.com",
    password: "donor123",
    name: "Priya Sharma",
    phone: "+91 87654 32109",
    organization: null,
    donor_category: "monthly",
    address: "45, Gandhi Nagar",
    city: "Coimbatore",
    state: "Tamil Nadu",
    pincode: "641001",
    pan_number: "BCDPS5678B",
    notes: "Regular monthly donor - ₹5000/month"
  },
  {
    email: "arun.venkat@example.com",
    password: "donor123",
    name: "Arun Venkatesh",
    phone: "+91 76543 21098",
    organization: "Venkat & Associates",
    donor_category: "yearly",
    address: "78, Anna Salai",
    city: "Madurai",
    state: "Tamil Nadu",
    pincode: "625001",
    pan_number: "CDEAV9012C",
    notes: "Annual donor - contributes during Pongal"
  },
  {
    email: "lakshmi.rajan@example.com",
    password: "donor123",
    name: "Lakshmi Rajan",
    phone: "+91 65432 10987",
    organization: null,
    donor_category: "public",
    address: "12, Temple Street",
    city: "Trichy",
    state: "Tamil Nadu",
    pincode: "620001",
    pan_number: null,
    notes: "First-time donor"
  },
  {
    email: "suresh.tech@example.com",
    password: "donor123",
    name: "Suresh Ramalingam",
    phone: "+91 54321 09876",
    organization: "TechSoft Solutions",
    donor_category: "csr",
    address: "IT Park, Phase 2",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600096",
    pan_number: "DEFSR3456D",
    notes: "IT company CSR - sponsors education needs"
  },
  {
    email: "meena.nair@example.com",
    password: "donor123",
    name: "Meena Nair",
    phone: "+91 43210 98765",
    organization: null,
    donor_category: "monthly",
    address: "234, Lake View Road",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560001",
    pan_number: "EFGMN7890E",
    notes: "Monthly sponsor for children's education"
  },
  {
    email: "vijay.textile@example.com",
    password: "donor123",
    name: "Vijay Murugan",
    phone: "+91 32109 87654",
    organization: "Vijay Textiles",
    donor_category: "yearly",
    address: "Textile Market, Ring Road",
    city: "Tirupur",
    state: "Tamil Nadu",
    pincode: "641602",
    pan_number: "FGHVM2345F",
    notes: "Donates clothes and textiles annually"
  },
  {
    email: "anitha.doctor@example.com",
    password: "donor123",
    name: "Dr. Anitha Krishnan",
    phone: "+91 21098 76543",
    organization: "City Hospital",
    donor_category: "public",
    address: "Medical Complex",
    city: "Salem",
    state: "Tamil Nadu",
    pincode: "636001",
    pan_number: "GHIAK6789G",
    notes: "Sponsors medical camps"
  },
  {
    email: "karthik.finance@example.com",
    password: "donor123",
    name: "Karthik Sundaram",
    phone: "+91 10987 65432",
    organization: "Sundaram Finance",
    donor_category: "csr",
    address: "Finance Tower, CBD",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600002",
    pan_number: "HIJKS1234H",
    notes: "Major CSR contributor - corpus fund"
  },
  {
    email: "deepa.teacher@example.com",
    password: "donor123",
    name: "Deepa Balasubramanian",
    phone: "+91 09876 54321",
    organization: null,
    donor_category: "monthly",
    address: "15, School Lane",
    city: "Vellore",
    state: "Tamil Nadu",
    pincode: "632001",
    pan_number: "IJKDB5678I",
    notes: "Retired teacher - monthly education sponsor"
  }
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results = [];

    for (const donor of DEMO_DONORS) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === donor.email);

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        console.log(`User ${donor.email} already exists, updating profile...`);
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: donor.email,
          password: donor.password,
          email_confirm: true,
          user_metadata: { name: donor.name }
        });

        if (createError) {
          console.error(`Error creating user ${donor.email}:`, createError);
          results.push({ email: donor.email, status: "error", error: createError.message });
          continue;
        }

        userId = newUser.user.id;

        // Assign donor role
        await supabaseAdmin.from("user_roles").upsert({
          user_id: userId,
          role: "donor"
        }, { onConflict: "user_id" });
      }

      // Update profile with donor details
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          name: donor.name,
          phone: donor.phone,
          organization: donor.organization,
          donor_category: donor.donor_category,
          address: donor.address,
          city: donor.city,
          state: donor.state,
          pincode: donor.pincode,
          pan_number: donor.pan_number,
          notes: donor.notes,
          status: "active"
        })
        .eq("id", userId);

      if (profileError) {
        console.error(`Error updating profile for ${donor.email}:`, profileError);
        results.push({ email: donor.email, status: "error", error: profileError.message });
      } else {
        results.push({ email: donor.email, status: "success", userId });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Seeded ${results.filter(r => r.status === "success").length} donors`,
        results,
        credentials: DEMO_DONORS.map(d => ({ email: d.email, password: d.password }))
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error seeding demo donors:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
