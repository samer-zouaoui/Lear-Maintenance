'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { apiFetch, getCurrentUser } from '../../lib/api';
import { useToast } from '../../components/ToastProvider';
import Sparkline from '../../components/Sparkline';
import TrendBadge from '../../components/TrendBadge';

const RED = '#C8102E';
const CHARCOAL = '#24262A';
const COLORS = ['#C8102E', '#9B0E24', '#E4574A', '#767981', '#24262A'];

const PERIODS = [
  { label: '7 jours', days: 7 },
  { label: '30 jours', days: 30 },
  { label: '90 jours', days: 90 },
  { label: 'Tout', days: null },
];

const CHART_DEFS = [
  { key: 'topMachines', title: 'Top machines (les plus en panne)' },
  { key: 'topCauses', title: 'Top causes de panne' },
  { key: 'classement', title: 'Classement des techniciens' },
];

export default function DashboardOverview() {
  const notify = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [periodDays, setPeriodDays] = useState(null);

  const [stats, setStats] = useState({ pannesOuvertes: 0 });
  const [mttr, setMttr] = useState(null);
  const [mtbf, setMtbf] = useState(null);
  const [downtime, setDowntime] = useState(null);
  const [disponibilite, setDisponibilite] = useState(null);
  const [machinesArret, setMachinesArret] = useState(null);
  const [classement, setClassement] = useState([]);
  const [topMachines, setTopMachines] = useState([]);
  const [topCauses, setTopCauses] = useState([]);
  const [dailySeries, setDailySeries] = useState([]);

  const [prevMttr, setPrevMttr] = useState(null);
  const [prevMtbf, setPrevMtbf] = useState(null);
  const [prevDowntime, setPrevDowntime] = useState(null);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [expandedChart, setExpandedChart] = useState(null);

  const canSeeDashboard = currentUser?.role === 'ADMIN' || currentUser?.role === 'RESPONSABLE_MAINTENANCE';

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const suffix = periodDays ? `?days=${periodDays}` : '';
        const [
          pannes, mttrData, mtbfData, downtimeData, dispoData, arretData,
          classementData, topMachinesData, topCausesData, serieData,
        ] = await Promise.all([
          apiFetch('/pannes'),
          apiFetch(`/dashboard/mttr${suffix}`),
          apiFetch(`/dashboard/mtbf${suffix}`),
          apiFetch(`/dashboard/downtime${suffix}`),
          apiFetch('/dashboard/disponibilite'),
          apiFetch('/dashboard/machines-arret'),
          apiFetch(`/dashboard/classement${suffix}`),
          apiFetch(`/dashboard/top-machines${suffix}`),
          apiFetch(`/dashboard/top-causes${suffix}`),
          apiFetch(`/dashboard/serie-quotidienne${suffix}`),
        ]);

        setStats({ pannesOuvertes: pannes.filter((p) => p.statutPanne !== 'RESOLU').length });
        setMttr(mttrData.mttr);
        setMtbf(mtbfData.mtbf);
        setDowntime(downtimeData.downtimeTotal);
        setDisponibilite(dispoData.tauxDisponibilite);
        setMachinesArret(arretData.machinesEnArret);
        setClassement(classementData);
        setTopMachines(topMachinesData.map((m) => ({ ...m, label: m.codeMachine })));
        setTopCauses(topCausesData);
        setDailySeries(serieData);

        // Comparaison à la période précédente (impossible pour "Tout", pas de fenêtre de référence)
        if (periodDays) {
          const prevSuffix = `?days=${periodDays}&offset=${periodDays}`;
          const [prevMttrData, prevMtbfData, prevDowntimeData] = await Promise.all([
            apiFetch(`/dashboard/mttr${prevSuffix}`),
            apiFetch(`/dashboard/mtbf${prevSuffix}`),
            apiFetch(`/dashboard/downtime${prevSuffix}`),
          ]);
          setPrevMttr(prevMttrData.mttr);
          setPrevMtbf(prevMtbfData.mtbf);
          setPrevDowntime(prevDowntimeData.downtimeTotal);
        } else {
          setPrevMttr(null);
          setPrevMtbf(null);
          setPrevDowntime(null);
        }
      } catch (err) {
        notify(err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodDays]);

  const periodLabel = PERIODS.find((p) => p.days === periodDays)?.label || 'Tout';

  function kpiRows() {
    return [
      ['Pannes en cours', String(stats.pannesOuvertes)],
      ['Machines en arrêt', machinesArret !== null ? String(machinesArret) : '—'],
      ['Disponibilité', disponibilite !== null ? `${disponibilite.toFixed(0)} %` : '—'],
      ['MTTR', mttr !== null ? `${mttr.toFixed(1)} h` : '—'],
      ['MTBF', mtbf !== null ? `${mtbf.toFixed(1)} h` : '—'],
      ['Downtime total', downtime !== null ? `${downtime.toFixed(1)} h` : '—'],
    ];
  }

  async function handleExportPDF() {
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setTextColor(200, 16, 46);
      doc.text('LEAR — Rapport de maintenance', 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      doc.text(`Période : ${periodLabel} — généré le ${new Date().toLocaleString('fr-FR')}`, 14, 25);

      autoTable(doc, {
        startY: 32,
        head: [['Indicateur', 'Valeur']],
        body: kpiRows(),
        headStyles: { fillColor: [200, 16, 46] },
        styles: { fontSize: 10 },
      });

      let nextY = doc.lastAutoTable.finalY + 10;

      if (topMachines.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(20, 20, 20);
        doc.text('Top machines (les plus en panne)', 14, nextY);
        autoTable(doc, {
          startY: nextY + 4,
          head: [['Machine', 'Nombre de pannes']],
          body: topMachines.map((m) => [m.codeMachine, String(m.nombrePannes)]),
          headStyles: { fillColor: [36, 38, 42] },
          styles: { fontSize: 10 },
        });
        nextY = doc.lastAutoTable.finalY + 10;
      }

      if (topCauses.length > 0) {
        doc.setFontSize(12);
        doc.text('Top causes de panne', 14, nextY);
        autoTable(doc, {
          startY: nextY + 4,
          head: [['Catégorie', 'Nombre de pannes']],
          body: topCauses.map((c) => [c.categorie, String(c.nombrePannes)]),
          headStyles: { fillColor: [36, 38, 42] },
          styles: { fontSize: 10 },
        });
        nextY = doc.lastAutoTable.finalY + 10;
      }

      if (classement.length > 0) {
        doc.setFontSize(12);
        doc.text('Classement des techniciens', 14, nextY);
        autoTable(doc, {
          startY: nextY + 4,
          head: [['Technicien', 'Interventions']],
          body: classement.map((c) => [c.nomTechnicien, String(c.nombreInterventions)]),
          headStyles: { fillColor: [36, 38, 42] },
          styles: { fontSize: 10 },
        });
      }

      doc.save(`lear-maintenance-rapport-${new Date().toISOString().slice(0, 10)}.pdf`);
      notify('Export PDF généré', 'success');
    } catch (err) {
      notify('Erreur lors de l\u2019export PDF', 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleExportExcel() {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const kpiSheet = XLSX.utils.aoa_to_sheet([['Indicateur', 'Valeur'], ...kpiRows()]);
      XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPIs');

      const machinesSheet = XLSX.utils.json_to_sheet(
        topMachines.map((m) => ({ Machine: m.codeMachine, 'Nombre de pannes': m.nombrePannes }))
      );
      XLSX.utils.book_append_sheet(wb, machinesSheet, 'Top machines');

      const causesSheet = XLSX.utils.json_to_sheet(
        topCauses.map((c) => ({ Catégorie: c.categorie, 'Nombre de pannes': c.nombrePannes }))
      );
      XLSX.utils.book_append_sheet(wb, causesSheet, 'Top causes');

      const classementSheet = XLSX.utils.json_to_sheet(
        classement.map((c) => ({ Technicien: c.nomTechnicien, Interventions: c.nombreInterventions }))
      );
      XLSX.utils.book_append_sheet(wb, classementSheet, 'Classement techniciens');

      XLSX.writeFile(wb, `lear-maintenance-rapport-${new Date().toISOString().slice(0, 10)}.xlsx`);
      notify('Export Excel généré', 'success');
    } catch (err) {
      notify('Erreur lors de l\u2019export Excel', 'error');
    } finally {
      setExporting(false);
    }
  }

  function renderChartBody(key, height) {
    if (key === 'topMachines') {
      return topMachines.length === 0 ? (
        <p className="chart-empty">Aucune donnée.</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={topMachines} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="nombrePannes" fill={RED} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    if (key === 'topCauses') {
      return topCauses.length === 0 ? (
        <p className="chart-empty">Aucune donnée.</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={topCauses} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="categorie" width={100} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="nombrePannes" radius={[0, 4, 4, 0]}>
              {topCauses.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
    return classement.length === 0 ? (
      <p className="chart-empty">Aucune donnée.</p>
    ) : (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={classement} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="nomTechnicien" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="nombreInterventions" fill={CHARCOAL} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // --- LES COMPORTEMENTS CONDITIONNELS COMMENCENT ICI (Tous les Hooks sont déclarés au-dessus) ---

  if (loading) {
    return (
      <>
        <div className="kpi-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="kpi-card" key={i}>
              <div className="skeleton-line" style={{ width: '50%', height: 12, marginBottom: 12 }} />
              <div className="skeleton-line" style={{ width: '35%', height: 26 }} />
            </div>
          ))}
        </div>
        <div className="panel">
          <div className="charts-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div className="chart-card" key={i}>
                <div className="skeleton-line" style={{ width: '60%', height: 12, marginBottom: 14 }} />
                <div className="skeleton-line" style={{ height: 150 }} />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (currentUser && !canSeeDashboard) {
    return (
      <div className="panel">
        <div className="panel-title">Accès restreint</div>
        <p style={{ color: '#767981', fontSize: 14 }}>
          Cette vue est réservée à l&apos;administration et à la maintenance.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-toolbar">
        <div className="period-switch">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              className={`period-btn ${periodDays === p.days ? 'active' : ''}`}
              onClick={() => setPeriodDays(p.days)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportExcel} disabled={exporting}>
            Export Excel
          </button>
          <button className="btn btn-primary" onClick={handleExportPDF} disabled={exporting}>
            Export PDF
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="label">Pannes en cours</div>
          <div className="value">{stats.pannesOuvertes}</div>
          <Sparkline data={dailySeries.map((d) => d.nombrePannes)} color={RED} />
        </div>
        <div className="kpi-card">
          <div className="label">Machines en arrêt</div>
          <div className="value">{machinesArret ?? '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="label">Disponibilité</div>
          <div className="value">{disponibilite !== null ? `${disponibilite.toFixed(0)} %` : '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="label">MTTR ({periodLabel})</div>
          <div className="kpi-value-row">
            <div className="value">{mttr !== null ? `${mttr.toFixed(1)} h` : '—'}</div>
            <TrendBadge current={mttr} previous={prevMttr} invertGood />
          </div>
          <Sparkline data={dailySeries.map((d) => d.mttrJour)} color={CHARCOAL} />
        </div>
        <div className="kpi-card">
          <div className="label">MTBF ({periodLabel})</div>
          <div className="kpi-value-row">
            <div className="value">{mtbf !== null ? `${mtbf.toFixed(1)} h` : '—'}</div>
            <TrendBadge current={mtbf} previous={prevMtbf} invertGood={false} />
          </div>
        </div>
        <div className="kpi-card">
          <div className="label">Downtime total ({periodLabel})</div>
          <div className="kpi-value-row">
            <div className="value">{downtime !== null ? `${downtime.toFixed(1)} h` : '—'}</div>
            <TrendBadge current={downtime} previous={prevDowntime} invertGood />
          </div>
          <Sparkline data={dailySeries.map((d) => d.downtimeHeures)} color={RED} />
        </div>
      </div>

      <div className="panel">
        {expandedChart ? (
          <>
            <div className="chart-expanded-header">
              <div className="panel-title" style={{ marginBottom: 0 }}>
                {CHART_DEFS.find((c) => c.key === expandedChart)?.title}
              </div>
              <button className="btn btn-ghost" onClick={() => setExpandedChart(null)}>
                Réduire ✕
              </button>
            </div>
            <div className="chart-expanded-body">
              {renderChartBody(expandedChart, 360)}
            </div>
            <div className="charts-strip">
              {CHART_DEFS.filter((c) => c.key !== expandedChart).map((c) => (
                <button key={c.key} className="chart-strip-card" onClick={() => setExpandedChart(c.key)}>
                  <div className="chart-strip-title">{c.title}</div>
                  <div className="chart-strip-hint">Cliquer pour agrandir</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="charts-grid">
            {CHART_DEFS.map((c) => (
              <div
                key={c.key}
                className="chart-card"
                onClick={() => setExpandedChart(c.key)}
                role="button"
                tabIndex={0}
              >
                <div className="chart-card-title">{c.title}</div>
                {renderChartBody(c.key, 190)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-title">Bienvenue {currentUser?.nomUser ? `, ${currentUser.nomUser}` : ''}</div>
        <p style={{ color: '#767981', fontSize: 14, margin: 0 }}>
          Utilise le menu à gauche pour consulter les machines, les pannes déclarées et les interventions réalisées.
        </p>
      </div>
    </>
  );
}