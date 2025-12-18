import supabase from "@/src/services/supabase";
import type { User } from "./usersSlice";

export const fetchUsers = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
    throw error;
  }

  return { data: data || [] };
};

export const createUser = async (user: Omit<User, "id">) => {
  const { data, error } = await supabase
    .from("users")
    .insert([{ name: user.name }])
    .select()
    .single();

  if (error) {
    console.error("Error creating user:", error);
    throw error;
  }

  return { data };
};

export const updateUser = async (user: User) => {
  const { data, error } = await supabase
    .from("users")
    .update({ name: user.name })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating user:", error);
    throw error;
  }

  return { data };
};

export const deleteUser = async (id: number) => {
  const { error } = await supabase.from("users").delete().eq("id", id);

  if (error) {
    console.error("Error deleting user:", error);
    throw error;
  }

  return { success: true };
};
