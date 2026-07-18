import { useMemo, useState } from "react";
import { Calendar, Fuel, Loader2, MapPin, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AudioLauncher } from "@/features/financeiro/components/AudioLauncher";
import { EmptyState } from "@/features/financeiro/components/EmptyState";
import type { FuelRecord, InventoryVehicle, ParseAudioGasolinaResult } from "@/features/financeiro/types";
import { currencyInputToNumberString, isPositiveNumberString, maskCurrencyInput, maskDecimalInput, maskPlate } from "@/features/financeiro/utils/form";
import { formatCurrency, formatDate } from "@/features/financeiro/utils/formatters";
import { trpc } from "@/lib/trpc";

export function GasolinaTab() {
  const [showForm, setShowForm] = useState(false);
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [fuelType, setFuelType] = useState("gasolina");
  const [liters, setLiters] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [odometer, setOdometer] = useState("");
  const [gasStation, setGasStation] = useState("");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: fuelRecords, refetch } = trpc.fuel.list.useQuery({});
  const { data: inventory } = trpc.crmInventory.list.useQuery();

  const createFuel = trpc.fuel.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowForm(false);
      resetForm();
      toast.success("Abastecimento registrado!");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  const resetForm = () => {
    setVehiclePlate("");
    setVehicleModel("");
    setFuelType("gasolina");
    setLiters("");
    setPricePerLiter("");
    setTotalCost("");
    setOdometer("");
    setGasStation("");
    setNotes("");
  };

  const calculateTotal = () => {
    const litersValue = parseFloat(liters);
    const priceValue = parseFloat(pricePerLiter);

    if (litersValue > 0 && priceValue > 0) {
      setTotalCost(maskCurrencyInput(String(litersValue * priceValue)));
    }
  };

  const handlePlateChange = (plate: string) => {
    const normalizedPlate = maskPlate(plate);
    setVehiclePlate(normalizedPlate);

    if (inventory && normalizedPlate.length >= 7) {
      const match = inventory.find((vehicle: InventoryVehicle) => vehicle.plate?.toUpperCase() === normalizedPlate);
      if (match) {
        setVehicleModel(`${match.brand} ${match.model}`);
      }
    }
  };

  const handleSubmit = () => {
    if (!vehiclePlate || vehiclePlate.length !== 7) {
      toast.error("Informe uma placa válida.");
      return;
    }
    if (!vehicleModel.trim()) {
      toast.error("Informe o veículo.");
      return;
    }
    if (!isPositiveNumberString(totalCost)) {
      toast.error("Informe um valor total válido.");
      return;
    }
    if (liters && !isPositiveNumberString(liters)) {
      toast.error("Informe a quantidade de litros corretamente.");
      return;
    }
    if (pricePerLiter && !isPositiveNumberString(pricePerLiter)) {
      toast.error("Informe o preço por litro corretamente.");
      return;
    }

    createFuel.mutate({
      vehiclePlate: vehiclePlate.toUpperCase(),
      vehicleModel: vehicleModel.trim(),
      fuelType: fuelType as "gasolina" | "etanol" | "diesel" | "gnv",
      liters: liters || "0",
      pricePerLiter: pricePerLiter || "0",
      totalCost: currencyInputToNumberString(totalCost) || "0",
      odometer: odometer ? parseInt(odometer, 10) : undefined,
      gasStation: gasStation.trim() || undefined,
      notes: notes.trim() || undefined,
      fuelDate: Date.now(),
    });
  };

  const allRecords: FuelRecord[] = fuelRecords || [];

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return allRecords;
    const query = searchQuery.toLowerCase();
    return allRecords.filter((record) =>
      record.vehiclePlate?.toLowerCase().includes(query) ||
      record.vehicleModel?.toLowerCase().includes(query) ||
      record.gasStation?.toLowerCase().includes(query)
    );
  }, [allRecords, searchQuery]);

  const stats = useMemo(() => {
    const currentMonthRecords = allRecords.filter((record) => {
      const date = new Date(record.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    return {
      count: currentMonthRecords.length,
      totalLiters: currentMonthRecords.reduce((sum, record) => sum + Number(record.liters || 0), 0),
      totalCost: currentMonthRecords.reduce((sum, record) => sum + Number(record.totalCost || 0), 0),
    };
  }, [allRecords]);

  const handleAudioResult = (parsed: ParseAudioGasolinaResult) => {
    if (parsed.vehiclePlate) setVehiclePlate(maskPlate(parsed.vehiclePlate));
    if (parsed.vehicleModel) setVehicleModel(parsed.vehicleModel);
    if (parsed.fuelType) setFuelType(parsed.fuelType);
    if (parsed.liters) setLiters(maskDecimalInput(String(parsed.liters), 3));
    if (parsed.pricePerLiter) setPricePerLiter(maskDecimalInput(String(parsed.pricePerLiter)));
    if (parsed.totalCost) setTotalCost(maskCurrencyInput(String(parsed.totalCost)));
    if (parsed.odometer) setOdometer(String(parsed.odometer).replace(/\D/g, ""));
    if (parsed.gasStation) setGasStation(parsed.gasStation);
    if (parsed.notes) setNotes(parsed.notes);
    toast.success("Dados preenchidos pelo áudio!");
  };

  return (
    <div className="container mx-auto max-w-lg space-y-4 px-4 py-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-center">
          <p className="text-xl font-bold text-yellow-400">{stats.count}</p>
          <p className="text-[10px] text-gray-500">Abastec. mês</p>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-center">
          <p className="text-xl font-bold text-blue-400">{stats.totalLiters.toFixed(1)}L</p>
          <p className="text-[10px] text-gray-500">Litros mês</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(stats.totalCost)}</p>
          <p className="text-[10px] text-gray-500">Gasto mês</p>
        </div>
      </div>

      <button
        onClick={() => setShowForm((current) => !current)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-600 py-3 text-sm font-bold text-white transition-all hover:bg-yellow-500"
      >
        {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {showForm ? "Cancelar" : "Novo Abastecimento"}
      </button>

      {showForm && (
        <div className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900/80 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Placa *</label>
              <Input
                value={vehiclePlate}
                onChange={(event) => handlePlateChange(event.target.value)}
                placeholder="ABC1D23"
                className="h-10 border-gray-700 bg-gray-800 text-sm text-white"
                maxLength={7}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Veículo</label>
              <Input
                value={vehicleModel}
                onChange={(event) => setVehicleModel(event.target.value)}
                placeholder="Marca / Modelo"
                className="h-10 border-gray-700 bg-gray-800 text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Combustível</label>
              <select
                value={fuelType}
                onChange={(event) => setFuelType(event.target.value)}
                className="h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-white"
              >
                <option value="gasolina">Gasolina</option>
                <option value="etanol">Etanol</option>
                <option value="diesel">Diesel</option>
                <option value="gnv">GNV</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Litros</label>
              <Input
                value={liters}
                onChange={(event) => setLiters(maskDecimalInput(event.target.value, 3))}
                onBlur={calculateTotal}
                placeholder="0.00"
                inputMode="decimal"
                className="h-10 border-gray-700 bg-gray-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">R$/Litro</label>
              <Input
                value={pricePerLiter}
                onChange={(event) => setPricePerLiter(maskDecimalInput(event.target.value))}
                onBlur={calculateTotal}
                placeholder="0.00"
                inputMode="decimal"
                className="h-10 border-gray-700 bg-gray-800 text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Total (R$) *</label>
              <Input
                value={totalCost}
                onChange={(event) => setTotalCost(maskCurrencyInput(event.target.value))}
                placeholder="0,00"
                inputMode="numeric"
                className="h-10 border-gray-700 bg-gray-800 text-sm font-bold text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">KM</label>
              <Input
                value={odometer}
                onChange={(event) => setOdometer(event.target.value.replace(/\D/g, ""))}
                placeholder="Odômetro"
                inputMode="numeric"
                className="h-10 border-gray-700 bg-gray-800 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500">Posto</label>
            <Input
              value={gasStation}
              onChange={(event) => setGasStation(event.target.value)}
              placeholder="Nome do posto"
              className="h-10 border-gray-700 bg-gray-800 text-sm text-white"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500">Observações</label>
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex: abastecimento para test drive"
              className="h-10 border-gray-700 bg-gray-800 text-sm text-white"
            />
          </div>

          <AudioLauncher onResult={handleAudioResult} context="gasolina" />

          <Button
            onClick={handleSubmit}
            disabled={createFuel.isPending}
            className="h-11 w-full bg-yellow-600 font-bold text-white hover:bg-yellow-500"
          >
            {createFuel.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Fuel className="mr-2 h-4 w-4" /> Registrar Abastecimento
              </>
            )}
          </Button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar por placa, veículo ou posto..."
          className="w-full rounded-xl border border-gray-800 bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:border-yellow-500 focus:outline-none"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((record) => (
            <div key={record.id} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Fuel className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
                    <p className="text-sm font-bold text-white">{record.vehiclePlate}</p>
                    {record.vehicleModel && <span className="text-xs text-gray-400">{record.vehicleModel}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                    <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 font-bold text-yellow-400">{record.fuelType}</span>
                    {record.liters && <span>{Number(record.liters).toFixed(1)}L</span>}
                    {record.pricePerLiter && <span>R${Number(record.pricePerLiter).toFixed(2)}/L</span>}
                    {record.odometer && <span>{record.odometer.toLocaleString("pt-BR")} km</span>}
                    {record.gasStation && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{record.gasStation}</span>
                    )}
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(record.createdAt)}</span>
                  </div>
                </div>
                <p className="ml-2 shrink-0 text-sm font-bold text-yellow-400">
                  {formatCurrency(Number(record.totalCost))}
                </p>
              </div>
              {record.notes && <p className="mt-2 text-[11px] text-gray-500">{record.notes}</p>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Fuel} message="Nenhum abastecimento registrado." />
      )}
    </div>
  );
}
