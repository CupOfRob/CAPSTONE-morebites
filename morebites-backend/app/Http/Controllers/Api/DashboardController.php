<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\InventoryItem;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->query('period', 'Daily');

        $todayOrders = Order::query()->whereDate('created_at', today());
        $totalSales = (clone $todayOrders)->sum('total');
        $totalOrders = (clone $todayOrders)->count();
        $activeOrders = (clone $todayOrders)->whereIn('status', [
            'Pending', 'Preparing', 'Ready', 'Out for Delivery',
        ])->count();
        $activeDrivers = User::query()
            ->where('role', 'driver')
            ->whereNull('archived_at')
            ->where(function ($q) {
                $q->where('status', 'active')->orWhereNull('status');
            })
            ->count();
        $lowStocksCount = InventoryItem::query()
            ->whereIn('status', ['Low Stock', 'Out of Stock'])
            ->count();

        $defaultHours = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM'];
        $salesRows = Order::query()
            ->select(DB::raw("DATE_FORMAT(created_at, '%l %p') as t"), DB::raw('SUM(total) as v'))
            ->whereDate('created_at', today())
            ->groupBy('t')
            ->orderBy('t')
            ->get()
            ->pluck('v', 't');

        $formattedSales = collect($defaultHours)->map(fn ($h) => [
            't' => $h,
            'v' => (float) ($salesRows[$h] ?? 0),
        ]);

        $statusCounts = Order::query()
            ->whereDate('created_at', today())
            ->select('status', DB::raw('COUNT(*) as value'))
            ->groupBy('status')
            ->pluck('value', 'status');

        $orderStatus = collect([
            'Preparing', 'Pending', 'Completed', 'Cancelled', 'Out for Delivery',
        ])->map(fn ($name) => [
            'name' => $name,
            'value' => (int) ($statusCounts[$name] ?? 0),
        ]);

        $recentOrders = Order::query()
            ->latest()
            ->take(5)
            ->get()
            ->map(fn (Order $o) => [
                'id' => $o->order_code,
                'customer' => $o->customer_name,
                'status' => $o->status,
                'amount' => '₱'.number_format($o->total, 0),
            ]);

        $activity = ActivityLog::query()
            ->latest()
            ->take(8)
            ->get()
            ->map(fn ($a) => [
                'time' => $a->created_at?->format('g:i A'),
                'user' => $a->actor ?: 'Admin',
                'action' => $a->action,
                'status' => 'Success',
            ]);

        $lowStocks = InventoryItem::query()
            ->whereIn('status', ['Low Stock', 'Out of Stock'])
            ->orderBy('stock')
            ->take(5)
            ->get()
            ->map(fn ($i) => [
                'name' => $i->name,
                'qty' => rtrim(rtrim(number_format($i->stock, 2), '0'), '.').' '.$i->unit,
                'level' => $i->reorder_level > 0
                    ? (int) min(100, max(0, ($i->stock / $i->reorder_level) * 50))
                    : 0,
            ]);

        return response()->json([
            'data' => [
                'period' => $period,
                'stats' => [
                    'total_sales' => (float) $totalSales,
                    'total_sales_label' => '₱'.number_format($totalSales, 2),
                    'total_orders' => $totalOrders,
                    'active_orders' => $activeOrders,
                    'active_drivers' => $activeDrivers,
                    'low_stocks_count' => $lowStocksCount,
                ],
                'sales' => $formattedSales,
                'order_status' => $orderStatus,
                'recent_orders' => $recentOrders,
                'activity_log' => $activity,
                'low_stocks' => $lowStocks,
            ],
        ]);
    }
}
