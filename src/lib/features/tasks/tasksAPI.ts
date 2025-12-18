import supabase from "@/src/services/supabase";
import type { Task } from "./tasksSlice";

export const fetchTasks = async () => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching tasks:", error);
    throw error;
  }

  return { data: data || [] };
};

export const createTask = async (task: Omit<Task, "id">) => {
  const { data, error } = await supabase
    .from("tasks")
    .insert([
      {
        title: task.title,
        content: task.content,
        date: task.date,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating task:", error);
    throw error;
  }

  return { data };
};

export const updateTask = async (task: Task) => {
  const { data, error } = await supabase
    .from("tasks")
    .update({
      title: task.title,
      content: task.content,
      date: task.date,
    })
    .eq("id", task.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating task:", error);
    throw error;
  }

  return { data };
};

export const deleteTask = async (id: number) => {
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    console.error("Error deleting task:", error);
    throw error;
  }

  return { success: true };
};
