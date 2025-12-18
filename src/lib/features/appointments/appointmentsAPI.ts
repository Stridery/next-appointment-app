import supabase from "@/src/services/supabase";
import type { Appointment } from "./appointmentsSlice";

export const fetchAppointments = async () => {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      appointment_services (
        service_id,
        services (*)
      )
    `)
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching appointments:", error);
    throw error;
  }

  // Map database format to match your TypeScript types
  const mappedData = data?.map((appointment: any) => ({
    id: appointment.id,
    customerId: appointment.customer_id,
    businessId: appointment.business_id,
    service: appointment.appointment_services?.map((as: any) => ({
      id: as.services.id,
      name: as.services.name,
      description: as.services.description,
      price: as.services.price,
      userId: as.services.user_id,
      businessId: as.services.business_id,
    })) || [],
    date: new Date(appointment.date),
  }));

  return { data: mappedData || [] };
};

export const createAppointment = async (appointment: Omit<Appointment, "id">) => {
  // First, create the appointment
  const { data: appointmentData, error: appointmentError } = await supabase
    .from("appointments")
    .insert([
      {
        customer_id: appointment.customerId,
        business_id: appointment.businessId,
        date: appointment.date,
      },
    ])
    .select()
    .single();

  if (appointmentError) {
    console.error("Error creating appointment:", appointmentError);
    throw appointmentError;
  }

  // Then, link services to the appointment
  if (appointment.service && appointment.service.length > 0) {
    const serviceLinks = appointment.service.map((service) => ({
      appointment_id: appointmentData.id,
      service_id: service.id,
    }));

    const { error: servicesError } = await supabase
      .from("appointment_services")
      .insert(serviceLinks);

    if (servicesError) {
      console.error("Error linking services:", servicesError);
      throw servicesError;
    }
  }

  return { data: appointmentData };
};

export const updateAppointment = async (appointment: Appointment) => {
  const { data, error } = await supabase
    .from("appointments")
    .update({
      customer_id: appointment.customerId,
      business_id: appointment.businessId,
      date: appointment.date,
    })
    .eq("id", appointment.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating appointment:", error);
    throw error;
  }

  return { data };
};

export const deleteAppointment = async (id: number) => {
  const { error } = await supabase.from("appointments").delete().eq("id", id);

  if (error) {
    console.error("Error deleting appointment:", error);
    throw error;
  }

  return { success: true };
};
