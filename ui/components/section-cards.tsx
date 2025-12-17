"use client"

import * as React from "react"
import { FuelIcon, Package2Icon, TrendingUpIcon, GripVertical, Maximize2, Minimize2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

interface SectionCardsProps {
  stats: {
    totalTransactions: number
    totalRevenue: number
    totalLiters: number
    lastUpdate: string
  }
}

interface CardData {
  id: string
  title: string
  value: string | number
  description: string
  footer: string
  icon: any
  iconLabel: string
  isExpanded?: boolean
}

function formatCurrency(amount: number): string {
  // Format số với dấu chấm phân cách hàng nghìn
  const formatted = new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
  return `${formatted} ₫`
}

function formatNumber(num: number): string {
  // Format số với dấu chấm phân cách hàng nghìn, tối đa 2 chữ số thập phân
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(num) || 0)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Component sortable cho từng stat card
function SortableStatCard({
  card,
  onToggleExpand,
}: {
  card: CardData
  onToggleExpand: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const Icon = card.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "transition-all duration-200",
        card.isExpanded && "col-span-full"
      )}
    >
      <Card className="@container/card h-full bg-gradient-to-t from-primary/5 to-card">
        <CardHeader className="relative pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <div
                {...listeners}
                className="hidden cursor-move touch-none rounded p-1 hover:bg-accent sm:block -ml-1"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription className="text-xs sm:text-sm">{card.title}</CardDescription>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Badge variant="outline" className="hidden gap-1 rounded-lg text-xs sm:flex">
                <Icon className="size-3" />
                <span className="hidden sm:inline">{card.iconLabel}</span>
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => onToggleExpand(card.id)}
              >
                {card.isExpanded ? (
                  <Minimize2 className="h-3 w-3" />
                ) : (
                  <Maximize2 className="h-3 w-3" />
                )}
                <span className="sr-only">
                  {card.isExpanded ? "Thu nhỏ" : "Phóng to"}
                </span>
              </Button>
            </div>
          </div>
          <CardTitle className="text-xl font-semibold tabular-nums sm:text-2xl @[250px]/card:text-3xl">
            {card.value}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 pt-0 text-xs sm:text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {card.description}
          </div>
          <div className="text-muted-foreground">{card.footer}</div>
        </CardFooter>
      </Card>
    </div>
  )
}

export function SectionCards({ stats }: SectionCardsProps) {
  const [cards, setCards] = React.useState<CardData[]>([
    {
      id: "revenue",
      title: "Tổng Doanh Thu",
      value: formatCurrency(stats.totalRevenue),
      description: "Tổng doanh thu từ tất cả giao dịch",
      footer: `Cập nhật: ${stats.lastUpdate ? formatDate(stats.lastUpdate) : "N/A"}`,
      icon: TrendingUpIcon,
      iconLabel: "Tổng",
      isExpanded: false,
    },
    {
      id: "transactions",
      title: "Tổng Giao Dịch",
      value: formatNumber(stats.totalTransactions),
      description: "Tổng số giao dịch",
      footer: "Tất cả các lần bơm nhiên liệu",
      icon: Package2Icon,
      iconLabel: "Giao dịch",
      isExpanded: false,
    },
    {
      id: "liters",
      title: "Tổng Lít Bán",
      value: `${formatNumber(stats.totalLiters)} L`,
      description: "Tổng lượng nhiên liệu",
      footer: "Đã bán từ tất cả các cột bơm",
      icon: FuelIcon,
      iconLabel: "Lít",
      isExpanded: false,
    },
    {
      id: "avgPrice",
      title: "Giá Trung Bình",
      value: `${formatCurrency(stats.totalLiters > 0 ? stats.totalRevenue / stats.totalLiters : 0)}/L`,
      description: "Giá trung bình mỗi lít",
      footer: "Tính trên tổng doanh thu",
      icon: TrendingUpIcon,
      iconLabel: "Trung bình",
      isExpanded: false,
    },
  ])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Update cards when stats change
  React.useEffect(() => {
    setCards((prevCards) =>
      prevCards.map((card) => {
        switch (card.id) {
          case "revenue":
            return {
              ...card,
              value: formatCurrency(stats.totalRevenue),
              footer: `Cập nhật: ${stats.lastUpdate ? formatDate(stats.lastUpdate) : "N/A"}`,
            }
          case "transactions":
            return { ...card, value: formatNumber(stats.totalTransactions) }
          case "liters":
            return { ...card, value: `${formatNumber(stats.totalLiters)} L` }
          case "avgPrice":
            return {
              ...card,
              value: `${formatCurrency(stats.totalLiters > 0 ? stats.totalRevenue / stats.totalLiters : 0)}/L`,
            }
          default:
            return card
        }
      })
    )
  }, [stats])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setCards((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  function handleToggleExpand(id: string) {
    setCards((items) =>
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
      <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <SortableStatCard
              key={card.id}
              card={card}
              onToggleExpand={handleToggleExpand}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
