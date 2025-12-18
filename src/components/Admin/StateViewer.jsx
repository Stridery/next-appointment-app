import { useAppSelector } from "@/src/lib/hooks";
import { selectUsers } from "@/src/lib/features/users/usersSlice";
import { selectAppointments } from "@/src/lib/features/appointments/appointmentsSlice";
import { selectBusinesses } from "@/src/lib/features/businesses/businessesSlice";
import AppointmentCalendar from "../Elements/Calendar/AppointmentCalendar";

export default function StateViewer() {
  const appointments = useAppSelector(selectAppointments);
  const users = useAppSelector(selectUsers);
  const businesses = useAppSelector(selectBusinesses);

  return (
    <div>
      <h2 className="text-2xl mb-2">Appointment Database Viewer</h2>
      <h3 className="text-xl">Appointments</h3>
      <div className="my-4 flex justify-center">
        <AppointmentCalendar />
      </div>
    </div>
  );
}
