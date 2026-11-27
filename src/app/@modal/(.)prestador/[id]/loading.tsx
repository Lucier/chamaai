import { Modal } from '@/components/ui/modal'

export default function Loading() {
  return (
    <Modal>
      <div className="skeleton aspect-[16/6] w-full rounded-none md:rounded-t-xl" />
      <div className="flex flex-col gap-3 p-6">
        <div className="skeleton h-4 w-1/4" />
        <div className="skeleton h-7 w-3/5" />
        <div className="skeleton h-4 w-2/5" />
      </div>
    </Modal>
  )
}
