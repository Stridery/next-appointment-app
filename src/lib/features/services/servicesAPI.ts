import supabase from "@/src/services/supabase";
import type { Service } from "./servicesSlice";

export const fetchServices = async () => {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching services:", error);
    throw error;
  }

  // Map database fields to match your TypeScript types
  const mappedData = data?.map((service: any) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    price: service.price,
    userId: service.user_id,
    businessId: service.business_id,
  }));

  return { data: mappedData || [] };
};

export const createService = async (service: Omit<Service, "id">) => {
  const { data, error } = await supabase
    .from("services")
    .insert([
      {
        name: service.name,
        description: service.description,
        price: service.price,
        user_id: service.userId,
        business_id: service.businessId,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating service:", error);
    throw error;
  }

  return { data };
};

export const updateService = async (service: Service) => {
  const { data, error } = await supabase
    .from("services")
    .update({
      name: service.name,
      description: service.description,
      price: service.price,
      user_id: service.userId,
      business_id: service.businessId,
    })
    .eq("id", service.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating service:", error);
    throw error;
  }

  return { data };
};

export const deleteService = async (id: number) => {
  const { error } = await supabase.from("services").delete().eq("id", id);

  if (error) {
    console.error("Error deleting service:", error);
    throw error;
  }

  return { success: true };
};
