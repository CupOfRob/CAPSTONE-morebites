<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\ExportedReport;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $tab = $request->query('tab', 'all');
        $search = $request->query('search');

        $stats = [
            'total_sales_today' => (float) Order::query()->whereDate('created_at', today())->sum('total'),
            'completed_deliveries' => Order::query()->where('status', 'Completed')->whereDate('created_at', today())->count(),
            'avg_delivery_time' => (int) (Order::query()->whereNotNull('delivery_minutes')->avg('delivery_minutes') ?: 0),
            'total_orders' => Order::query()->whereDate('created_at', today())->count(),
        ];

        $all = Order::query()->latest();
        if ($search) {
            $all->where(function ($q) use ($search) {
                $q->where('order_code', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%");
            });
        }

        $allRecords = $all->take(50)->get()->map(fn (Order $o) => [
            'id' => $o->order_code,
            'customer' => $o->customer_name,
            'datetime' => $o->created_at?->format('M d, Y h:i A'),
            'type' => $o->order_type,
            'amount' => (float) $o->total,
            'payment' => $o->payment_method ?: 'COD',
            'status' => $o->payment_status ?: 'Paid',
        ]);

        $delivery = Order::query()
            ->with('driver')
            ->whereNotNull('driver_id')
            ->latest()
            ->take(50)
            ->get()
            ->map(fn (Order $o) => [
                'id' => $o->order_code,
                'driver' => $o->driver?->name ?? 'N/A',
                'datetime' => $o->created_at?->format('M d, Y h:i A'),
                'time' => ($o->delivery_minutes ?: 14).' mins',
                'distance' => ($o->delivery_distance_km ?: 3.5).' km',
                'status' => $o->status === 'Completed' ? 'Completed' : $o->status,
            ]);

        $customers = Customer::query()
            ->withCount('orders')
            ->withSum('orders', 'total')
            ->get()
            ->map(function (Customer $c) {
                $last = $c->orders()->latest()->first();

                return [
                    'name' => $c->full_name,
                    'orders' => $c->orders_count,
                    'spent' => (float) ($c->orders_sum_total ?: 0),
                    'last' => $last?->created_at?->format('M d, Y') ?? '-',
                    'freq' => $c->orders_count >= 15 ? 'Frequent' : 'Regular',
                ];
            });

        $topItems = OrderItem::query()
            ->select('name', DB::raw('SUM(qty) as units'))
            ->groupBy('name')
            ->orderByDesc('units')
            ->take(5)
            ->get()
            ->map(fn ($i) => [
                'name' => $i->name,
                'units' => (int) $i->units,
                'change' => '+1.0%',
            ]);

        $exports = ExportedReport::query()->latest()->take(10)->get()->map(fn ($e) => [
            'id' => $e->id,
            'name' => $e->name,
            'date' => $e->created_at?->format('M d, Y'),
            'size' => $e->size,
            'format' => $e->format,
        ]);

        return response()->json([
            'data' => [
                'stats' => $stats,
                'all_records' => $allRecords,
                'delivery_records' => $delivery,
                'customer_records' => $customers,
                'top_items' => $topItems,
                'exports' => $exports,
                'tab' => $tab,
            ],
        ]);
    }

    public function generate(Request $request)
    {
        $data = $request->validate([
            'period' => ['required', 'string'],
            'format_type' => ['required', 'string'],
            'export_as' => ['required', 'string'],
        ]);

        $ext = strtolower($data['export_as']) === 'excel' ? 'xlsx' : 'pdf';
        $report = ExportedReport::query()->create([
            'name' => str_replace(' ', '_', $data['format_type']).'_'.$data['period'].'.'.$ext,
            'format' => $data['export_as'],
            'size' => '1.2 MB',
        ]);

        return response()->json(['data' => $report], 201);
    }
}
