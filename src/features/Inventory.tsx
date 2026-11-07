import { useState } from "react";
import { Plus, Search, QrCode, Pencil, Archive, ArrowLeft } from "lucide-react";
import { useApp } from "../lib/context";
import { rpc, supabase, uploadPhoto } from "../lib/supabase";
import { CATEGORIES, CONDITIONS, type Equipment } from "../lib/types";
import {
  Badge,
  Dialog,
  Empty,
  EquipmentPhoto,
  Field,
  Heading,
  Table,
  value,
} from "../components/ui";
import { formatDate } from "../lib/rules";
export function EquipmentForm({
  item,
  onClose,
}: {
  item?: Equipment;
  onClose: () => void;
}) {
  const { perform } = useApp();
  return (
    <Dialog
      title={item ? "Edit equipment" : "Register equipment"}
      onClose={onClose}
      submit={item ? "Save changes" : "Register equipment"}
      onSubmit={async (f) => {
        const file = f.get("photo") as File;
        let path = item?.photo_path || null;
        let uploaded: string | null = null;
        try {
          if (file?.size) {
            uploaded = await uploadPhoto(file);
            path = uploaded;
          }
          await perform(
            () =>
              rpc("save_equipment", {
                p_id: item?.id || null,
                p_data: {
                  asset_number: value(f, "asset"),
                  name: value(f, "name"),
                  serial_number: value(f, "serial"),
                  category: value(f, "category"),
                  location: value(f, "location"),
                  condition: value(f, "condition"),
                  remarks: value(f, "remarks"),
                  photo_path: path,
                },
              }),
            "Equipment saved",
          );
        } catch (e) {
          if (uploaded)
            await supabase.storage.from("equipment-photos").remove([uploaded]);
          throw e;
        }
      }}
    >
      <div className="form-grid">
        <Field label="Equipment name">
          <input
            name="name"
            required
            maxLength={160}
            defaultValue={item?.name}
          />
        </Field>
        <Field label="Asset number">
          <input
            name="asset"
            required
            maxLength={40}
            placeholder="EQ-007"
            defaultValue={item?.asset_number}
          />
        </Field>
        <Field label="Serial number">
          <input
            name="serial"
            maxLength={120}
            defaultValue={item?.serial_number}
          />
        </Field>
        <Field label="Category">
          <select
            name="category"
            defaultValue={item?.category || CATEGORIES[0]}
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Location">
          <input
            name="location"
            required
            maxLength={120}
            defaultValue={item?.location}
          />
        </Field>
        <Field label="Condition">
          <select name="condition" defaultValue={item?.condition || "Good"}>
            {CONDITIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Equipment photo (JPEG, PNG, WebP · up to 5 MB)" full>
          <input
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
        </Field>
        <Field label="Remarks and included accessories" full>
          <textarea
            name="remarks"
            maxLength={2000}
            defaultValue={item?.remarks}
          />
        </Field>
      </div>
    </Dialog>
  );
}
export function Inventory() {
  const { data, profile, navigate } = useApp();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const staff = profile.role !== "borrower";
  const rows = data.equipment.filter(
    (e) =>
      (status === "Archived" ? true : e.availability !== "Archived") &&
      (!category || e.category === category) &&
      (!status || e.availability === status) &&
      [e.name, e.asset_number, e.serial_number, e.location].some((v) =>
        v.toLowerCase().includes(search.toLowerCase()),
      ),
  );
  return (
    <>
      <Heading
        title="Equipment Inventory"
        description="Equipment, locations, and availability."
      >
        {staff && (
          <button className="button" onClick={() => setAdding(true)}>
            <Plus size={17} />
            Register equipment
          </button>
        )}
      </Heading>
      <section className="card">
        <div className="toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              aria-label="Search equipment"
              placeholder="Search asset, name, or serial…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filter availability"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All active equipment</option>
            {[
              "Available",
              "Reserved",
              "Borrowed",
              "Maintenance",
              "Archived",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <span className="muted">{rows.length} assets</span>
        </div>
        {rows.length ? (
          <Table
            headers={[
              "Equipment",
              "Asset / Serial",
              "Category",
              "Location",
              "Condition",
              "Status",
              "",
            ]}
          >
            {rows.map((e) => (
              <tr key={e.id}>
                <td>
                  <div className="asset-cell">
                    <EquipmentPhoto path={e.photo_path} name={e.name} />
                    <strong>{e.name}</strong>
                  </div>
                </td>
                <td>
                  <strong className="mono">{e.asset_number}</strong>
                  <small>{e.serial_number || "No serial number"}</small>
                </td>
                <td>{e.category}</td>
                <td>{e.location}</td>
                <td>{e.condition}</td>
                <td>
                  <Badge value={e.availability} />
                </td>
                <td>
                  <button
                    className="button secondary small"
                    onClick={() => navigate(`equipment/${e.id}`)}
                  >
                    View record
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty title="No equipment found">
            Try another search or register an equipment record.
          </Empty>
        )}
      </section>
      {adding && <EquipmentForm onClose={() => setAdding(false)} />}
    </>
  );
}
export function EquipmentDetails({ id }: { id: string }) {
  const { data, profile, navigate, perform } = useApp();
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const item = data.equipment.find((e) => e.id === id);
  if (!item)
    return (
      <Empty title="Equipment not found">
        The link may be invalid. Open the inventory to find an asset.
      </Empty>
    );
  const staff = profile.role !== "borrower";
  const history = data.requests.filter((r) => r.equipment_id === id);
  return (
    <>
      <button
        className="text-button back"
        onClick={() => navigate("inventory")}
      >
        <ArrowLeft size={16} />
        Equipment inventory
      </button>
      <Heading
        title={item.name}
        description={`${item.asset_number} · ${item.category}`}
      >
        <button
          className="button secondary"
          onClick={() => navigate(`qr/${item.id}`)}
        >
          <QrCode size={17} />
          QR label
        </button>
        {staff && item.availability !== "Archived" && (
          <>
            <button className="button" onClick={() => setEditing(true)}>
              <Pencil size={16} />
              Edit
            </button>
            <button
              className="button danger-outline"
              onClick={() => setArchiving(true)}
            >
              <Archive size={16} />
              Archive
            </button>
          </>
        )}
        {item.availability === "Available" && (
          <button
            className="button"
            onClick={() => navigate(`borrowing/new/${item.id}`)}
          >
            Request this equipment
          </button>
        )}
      </Heading>
      <div className="detail-layout">
        <section className="card">
          <EquipmentPhoto large path={item.photo_path} name={item.name} />
          <div className="record-grid">
            {[
              ["Status", <Badge value={item.availability} />],
              ["Condition", item.condition],
              ["Asset number", item.asset_number],
              ["Serial number", item.serial_number || "—"],
              ["Location", item.location],
              ["Registered", formatDate(item.created_at)],
            ].map(([label, v]) => (
              <div key={String(label)}>
                <span className="muted">{label}</span>
                <p>{v}</p>
              </div>
            ))}
          </div>
          <h3>Remarks & accessories</h3>
          <p className="preserve">{item.remarks || "No additional remarks."}</p>
        </section>
        <section className="card">
          <h2>
            {staff ? "Borrowing history" : "Your requests for this asset"}
          </h2>
          {history.length ? (
            <Table headers={["Request", "Dates", "Status"]}>
              {history.map((r) => (
                <tr key={r.id}>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => navigate(`borrowing/${r.id}`)}
                    >
                      REQ-{r.reference}
                    </button>
                  </td>
                  <td>
                    {formatDate(r.requested_date)}
                    <small>Due {formatDate(r.due_date)}</small>
                  </td>
                  <td>
                    <Badge value={r.status} />
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty title="No borrowing history" />
          )}
        </section>
      </div>
      {editing && (
        <EquipmentForm item={item} onClose={() => setEditing(false)} />
      )}{" "}
      {archiving && (
        <Dialog
          title="Archive equipment"
          onClose={() => setArchiving(false)}
          submit="Archive equipment"
          onSubmit={async () => {
            await perform(
              () => rpc("archive_equipment", { p_id: item.id }),
              "Equipment archived",
            );
          }}
        >
          <p>
            Archive {item.name}? Its borrowing and maintenance history will
            remain available. Reserved or borrowed equipment must be cleared
            first.
          </p>
        </Dialog>
      )}
    </>
  );
}
