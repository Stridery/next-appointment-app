import supabase from "@/src/services/supabase";
import type { Specialist } from "./specialistsSlice";

export const fetchSpecialists = async () => {
  const { data, error } = await supabase
    .from("specialists")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching specialists:", error);
    throw error;
  }

  return { data: data || [] };
};

export const createSpecialist = async (specialist: Omit<Specialist, "id">) => {
  const { data, error } = await supabase
    .from("specialists")
    .insert([
      {
        name: specialist.name,
        intro: specialist.intro,
        user_id: specialist.userId,
        business_id: specialist.businessId,
        availabilities: specialist.availibilities,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating specialist:", error);
    throw error;
  }

  return { data };
};

export const updateSpecialist = async (specialist: Specialist) => {
  const { data, error } = await supabase
    .from("specialists")
    .update({
      name: specialist.name,
      intro: specialist.intro,
      user_id: specialist.userId,
      business_id: specialist.businessId,
      availabilities: specialist.availibilities,
    })
    .eq("id", specialist.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating specialist:", error);
    throw error;
  }

  return { data };
};

export const deleteSpecialist = async (id: number) => {
  const { error } = await supabase.from("specialists").delete().eq("id", id);

  if (error) {
    console.error("Error deleting specialist:", error);
    throw error;
  }

  return { success: true };
};
