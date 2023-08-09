import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getBotDashboardData } from "@/lib/bot"
export const revalidate = 0;
const invoices = [
  {
    invoice: "INV001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV003",
    paymentStatus: "Unpaid",
    totalAmount: "$350.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV004",
    paymentStatus: "Paid",
    totalAmount: "$450.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV005",
    paymentStatus: "Paid",
    totalAmount: "$550.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV006",
    paymentStatus: "Pending",
    totalAmount: "$200.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV007",
    paymentStatus: "Unpaid",
    totalAmount: "$300.00",
    paymentMethod: "Credit Card",
  },
]
const BotPage = async () => {
  const botDashData = await getBotDashboardData()
  console.log(botDashData, "front")
  return (
    <Table className="text-center">
      <TableCaption>Bot Dashboard.</TableCaption>
      <TableHeader className="bg-secondary">
        <TableRow className="text-center font-bold">
          <TableHead className="p-12">Data</TableHead>
          <TableHead className="">PV</TableHead>
          <TableHead className="">CRON</TableHead>
          <TableHead className="">comments</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {botDashData.map((botDashData:any) => (
          <TableRow key={botDashData.Date}>
            <TableCell className="font-medium w-[90px]">{botDashData.Date}</TableCell>
            <TableCell>{botDashData.pageViewFromYoutube}</TableCell>
            <TableCell>{botDashData.cronRuns}</TableCell>
            <TableCell className="">{botDashData.commentedVideos}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default BotPage;
