"use client"

import * as React from "react"
import { GripVertical, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { FuelRevenueChart } from "@/components/fuel-revenue-chart"
import { PeakHoursChart } from "@/components/peak-hours-chart"

interface ChartSectionProps {
  revenueChartData: any[]
  peakHoursData: any[]
  uniqueDays?: number
}

interface ChartItem {
  id: string
  component: React.ReactNode
  isExpanded: boolean
}

// Component sortable cho từng chart
function SortableChart({
  item,
  onToggleExpand,
}: {
  item: ChartItem
  onToggleExpand: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "transition-all duration-200 relative",
        item.isExpanded && "col-span-full"
      )}
    >
      {/* Drag handle và expand button overlay */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 bg-background/80 backdrop-blur-sm sm:h-8 sm:w-8"
          onClick={() => onToggleExpand(item.id)}
        >
          {item.isExpanded ? (
            <Minimize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          ) : (
            <Maximize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          )}
          <span className="sr-only">
            {item.isExpanded ? "Thu nhỏ" : "Phóng to"}
          </span>
        </Button>
        <div
          {...listeners}
          className="hidden cursor-move touch-none rounded border bg-background/80 p-1.5 shadow-sm backdrop-blur-sm hover:bg-accent/80 sm:block"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      
      {/* Chart content */}
      {item.component}
    </div>
  )
}

export function ChartSection({ revenueChartData, peakHoursData, uniqueDays }: ChartSectionProps) {
  const [charts, setCharts] = React.useState<ChartItem[]>([
    {
      id: "revenue-chart",
      component: <FuelRevenueChart chartData={revenueChartData} />,
      isExpanded: false,
    },
    {
      id: "peak-hours-chart",
      component: <PeakHoursChart chartData={peakHoursData} uniqueDays={uniqueDays} />,
      isExpanded: false,
    },
  ])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Update charts when data changes
  React.useEffect(() => {
    setCharts((prevCharts) =>
      prevCharts.map((chart) => {
        if (chart.id === "revenue-chart") {
          return {
            ...chart,
            component: <FuelRevenueChart chartData={revenueChartData} />,
          }
        }
        if (chart.id === "peak-hours-chart") {
          return {
            ...chart,
            component: <PeakHoursChart chartData={peakHoursData} uniqueDays={uniqueDays} />,
          }
        }
        return chart
      })
    )
  }, [revenueChartData, peakHoursData, uniqueDays])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setCharts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  function handleToggleExpand(id: string) {
    setCharts((items) =>
      items.map((item) =>
        item.id === id ? { ...item, isExpanded: !item.isExpanded } : item
      )
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={charts.map((c) => c.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2">
          {charts.map((chart) => (
            <SortableChart
              key={chart.id}
              item={chart}
              onToggleExpand={handleToggleExpand}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

