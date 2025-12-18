import supabase from "@/src/services/supabase";
import type { Business } from "./businessesSlice";

export const fetchCompanies = async () => {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching businesses:", error);
    throw error;
  }

  return { data: data || [] };
};

export const createBusiness = async (business: Omit<Business, "id">) => {
  const { data, error } = await supabase
    .from("businesses")
    .insert([
      {
        name: business.name,
        city: business.city,
        latitude: business.latitude,
        longitude: business.longitude,
        address: business.address,
        phone: business.phone,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating business:", error);
    throw error;
  }

  return { data };
};

export const updateBusiness = async (business: Business) => {
  const { data, error } = await supabase
    .from("businesses")
    .update({
      name: business.name,
      city: business.city,
      latitude: business.latitude,
      longitude: business.longitude,
      address: business.address,
      phone: business.phone,
    })
    .eq("id", business.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating business:", error);
    throw error;
  }

  return { data };
};

export const deleteBusiness = async (id: number) => {
  const { error } = await supabase.from("businesses").delete().eq("id", id);

  if (error) {
    console.error("Error deleting business:", error);
    throw error;
  }

  return { success: true };
};
