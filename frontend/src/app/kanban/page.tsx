import DashboardLayout from '@/components/DashboardLayout'
import KanbanBoard from '@/components/KanbanBoard'

export const metadata = {
  title: 'Kanban Board - Agenda Manager',
  description: 'Visual workflow management for meeting requests'
}

export default function KanbanPage() {
  return (
    <DashboardLayout>
      <KanbanBoard />
    </DashboardLayout>
  )
}
