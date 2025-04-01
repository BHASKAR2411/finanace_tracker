"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { Pie, Bar } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js"
import BudgetForm from "../components/BudgetForm"
import IncomeForm from "../components/IncomeForm"
import ExpenseForm from "../components/ExpenseForm"
import { auth } from "../firebase/config"
import { signOut } from "firebase/auth"
import { Moon, Sun } from "lucide-react"

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const Dashboard = () => {
  const navigate = useNavigate()
  const [income, setIncome] = useState([])
  const [expenses, setExpenses] = useState([])
  const [splitExpenses, setSplitExpenses] = useState([])
  const [chartData, setChartData] = useState({})
  const [user, setUser] = useState(null)
  const [editingIncomeId, setEditingIncomeId] = useState(null)
  const [editingExpenseId, setEditingExpenseId] = useState(null)
  const [editFormData, setEditFormData] = useState({})
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme === "dark") {
      setDarkMode(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    if (!darkMode) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      }

      const userRes = await axios.get("https://finanace-tracker-backend.onrender.com/auth/user", config)
      setUser(userRes.data)

      const incomeRes = await axios.get("https://finanace-tracker-backend.onrender.com/transactions/income", config)
      const expensesRes = await axios.get("https://finanace-tracker-backend.onrender.com/transactions/expenses", config)
      const splitExpensesRes = await axios.get("https://finanace-tracker-backend.onrender.com/transactions/split-expenses", config)

      setIncome(incomeRes.data)
      setExpenses(expensesRes.data)
      setSplitExpenses(splitExpensesRes.data)

      const expensesByCategory = expensesRes.data.reduce((acc, item) => {
        const category = item.category || "Other"
        acc[category] = (acc[category] || 0) + Number.parseFloat(item.amount)
        return acc
      }, {})

      const totalIncome = incomeRes.data.reduce((sum, item) => sum + Number.parseFloat(item.amount), 0)
      const totalExpenses = expensesRes.data.reduce((sum, item) => sum + Number.parseFloat(item.amount), 0)

      setChartData({
        expensesByCategory: {
          labels: Object.keys(expensesByCategory),
          datasets: [
            {
              label: "Expenses by Category",
              data: Object.values(expensesByCategory),
              backgroundColor: [
                "#FF6384",
                "#36A2EB",
                "#FFCE56",
                "#4BC0C0",
                "#9966FF",
                "#FF9F40",
                "#8AC926",
                "#1982C4",
                "#6A4C93",
                "#F15BB5",
              ],
              borderColor: darkMode ? "#374151" : "#ffffff",
              borderWidth: 2,
            },
          ],
        },
        incomeVsExpenses: {
          labels: ["Income", "Expenses"],
          datasets: [
            {
              label: "Amount ($)",
              data: [totalIncome, totalExpenses],
              backgroundColor: ["#4CAF50", "#FF5252"],
              borderColor: ["#388E3C", "#D32F2F"],
              borderWidth: 1,
            },
          ],
        },
      })
    } catch (error) {
      console.error("Error fetching data:", error)
      if (error.response?.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("user_id")
        navigate("/")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/")
      return
    }
    fetchData()
  }, [navigate])

  useEffect(() => {
    if (Object.keys(chartData).length > 0) {
      setChartData((prevData) => ({
        ...prevData,
        expensesByCategory: {
          ...prevData.expensesByCategory,
          datasets: [
            {
              ...prevData.expensesByCategory.datasets[0],
              borderColor: darkMode ? "#374151" : "#ffffff",
            },
          ],
        },
      }))
    }
  }, [darkMode])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      localStorage.removeItem("token")
      localStorage.removeItem("user_id")
      navigate("/")
    } catch (error) {
      console.error("Error signing out:", error)
      alert("Failed to sign out: " + error.message)
    }
  }

  const handleAccountNavigation = () => {
    navigate("/account")
  }

  const handleEditStart = (entry, type) => {
    if (type === "income") {
      setEditingIncomeId(entry.id)
    } else {
      setEditingExpenseId(entry.id)
    }
    setEditFormData({
      amount: entry.amount,
      category: entry.category || "",
      date: entry.date,
      description: entry.description || "",
      receipt_url: entry.receipt_url || "",
    })
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditSubmit = async (id, type) => {
    try {
      const token = localStorage.getItem("token")
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      }

      await axios.put(`https://finanace-tracker-backend.onrender.com/transactions/${id}`, { type, ...editFormData }, config)

      setEditingIncomeId(null)
      setEditingExpenseId(null)
      setEditFormData({})
      fetchData() // Refresh the data
    } catch (error) {
      console.error("Error editing transaction:", error)
      alert("Failed to edit transaction: " + error.message)
    }
  }

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type} entry?`)) {
      return
    }

    try {
      const token = localStorage.getItem("token")
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      }

      await axios.delete(`https://finanace-tracker-backend.onrender.com/transactions/${id}`, {
        ...config,
        data: { type },
      })

      fetchData()
    } catch (error) {
      console.error("Error deleting transaction:", error)
      alert("Failed to delete transaction: " + error.message)
    }
  }

  const totalIncome = income.reduce((sum, item) => sum + Number.parseFloat(item.amount), 0)
  const totalExpenses = expenses.reduce((sum, item) => sum + Number.parseFloat(item.amount), 0)
  const balance = totalIncome - totalExpenses

  
  const darkStyles = {
    container: {
      backgroundColor: darkMode ? "#111827" : "#f5f7fa",
      color: darkMode ? "#e5e7eb" : "inherit",
    },
    header: {
      backgroundColor: darkMode ? "#1f2937" : "#ffffff",
      boxShadow: darkMode ? "0 2px 10px rgba(0, 0, 0, 0.2)" : "0 2px 10px rgba(0, 0, 0, 0.05)",
    },
    title: {
      color: darkMode ? "#e5e7eb" : "#333",
    },
    userEmail: {
      color: darkMode ? "#9ca3af" : "#666",
    },
    accountButton: {
      backgroundColor: darkMode ? "#374151" : "#f0f2f5",
      color: darkMode ? "#e5e7eb" : "#333",
    },
    sidebar: {
      backgroundColor: darkMode ? "#1f2937" : "#ffffff",
      boxShadow: darkMode ? "0 2px 10px rgba(0, 0, 0, 0.2)" : "0 2px 10px rgba(0, 0, 0, 0.05)",
    },
    avatar: {
      backgroundColor: darkMode ? "#374151" : "#e3f2fd",
      color: darkMode ? "#60a5fa" : "#1976d2",
    },
    welcomeText: {
      color: darkMode ? "#e5e7eb" : "#333",
    },
    navButton: {
      color: darkMode ? "#9ca3af" : "#666",
    },
    activeNavButton: {
      backgroundColor: darkMode ? "#374151" : "#e3f2fd",
      color: darkMode ? "#60a5fa" : "#1976d2",
    },
    content: {
      backgroundColor: darkMode ? "#1f2937" : "#ffffff",
      boxShadow: darkMode ? "0 2px 10px rgba(0, 0, 0, 0.2)" : "0 2px 10px rgba(0, 0, 0, 0.05)",
    },
    sectionTitle: {
      color: darkMode ? "#e5e7eb" : "#333",
    },
    tableCount: {
      color: darkMode ? "#9ca3af" : "#666",
    },
    tableWrapper: {
      border: darkMode ? "1px solid #374151" : "1px solid #eee",
    },
    th: {
      backgroundColor: darkMode ? "#374151" : "#f8f9fa",
      color: darkMode ? "#9ca3af" : "#666",
      borderBottom: darkMode ? "1px solid #4b5563" : "1px solid #eee",
    },
    tr: {
      borderBottom: darkMode ? "1px solid #374151" : "1px solid #eee",
    },
    td: {
      color: darkMode ? "#e5e7eb" : "#333",
    },
    chartCard: {
      backgroundColor: darkMode ? "#1f2937" : "#ffffff",
      boxShadow: darkMode ? "0 2px 8px rgba(0, 0, 0, 0.2)" : "0 2px 8px rgba(0, 0, 0, 0.05)",
    },
    chartTitle: {
      color: darkMode ? "#e5e7eb" : "#333",
    },
    formCard: {
      backgroundColor: darkMode ? "#1f2937" : "#ffffff",
      boxShadow: darkMode ? "0 2px 8px rgba(0, 0, 0, 0.2)" : "0 2px 8px rgba(0, 0, 0, 0.05)",
    },
    formCardTitle: {
      color: darkMode ? "#e5e7eb" : "#333",
    },
    editInput: {
      backgroundColor: darkMode ? "#374151" : "#fff",
      color: darkMode ? "#e5e7eb" : "inherit",
      border: darkMode ? "1px solid #4b5563" : "1px solid #ddd",
    },
    emptyState: {
      color: darkMode ? "#9ca3af" : "#666",
    },
  }

  return (
    <div style={{ ...styles.container, ...darkStyles.container }}>
      <div style={{ ...styles.header, ...darkStyles.header }}>
        <div style={styles.headerContent}>
          <h1 style={{ ...styles.title, ...darkStyles.title }}>Financial Dashboard</h1>
          <div style={styles.userInfo}>
            {/* Theme toggle button */}
            <button
              onClick={toggleDarkMode}
              style={{
                padding: "8px",
                backgroundColor: darkMode ? "#374151" : "#f0f2f5",
                color: darkMode ? "#e5e7eb" : "#333",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {user && (
              <div style={styles.userInfo}>
                <span style={{ ...styles.userEmail, ...darkStyles.userEmail }}>{user.email}</span>
                <div style={styles.userActions}>
                  <button
                    style={{ ...styles.accountButton, ...darkStyles.accountButton }}
                    onClick={handleAccountNavigation}
                  >
                    Settings
                  </button>
                  <button style={styles.logoutButton} onClick={handleLogout}>
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={{ ...styles.sidebar, ...darkStyles.sidebar }}>
          <div style={styles.sidebarHeader}>
            <div style={{ ...styles.avatar, ...darkStyles.avatar }}>
              {user && user.email ? user.email.charAt(0).toUpperCase() : "?"}
            </div>
            <div style={styles.userDetails}>
              <h3 style={{ ...styles.welcomeText, ...darkStyles.welcomeText }}>Welcome back</h3>
              <p style={{ ...styles.userEmail, ...darkStyles.userEmail }}>{user?.email || "Loading..."}</p>
            </div>
          </div>

          <div style={styles.navigation}>
            <button
              style={
                activeTab === "overview"
                  ? {
                      ...styles.navButton,
                      ...styles.activeNavButton,
                      ...darkStyles.navButton,
                      ...darkStyles.activeNavButton,
                    }
                  : { ...styles.navButton, ...darkStyles.navButton }
              }
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              style={
                activeTab === "income"
                  ? {
                      ...styles.navButton,
                      ...styles.activeNavButton,
                      ...darkStyles.navButton,
                      ...darkStyles.activeNavButton,
                    }
                  : { ...styles.navButton, ...darkStyles.navButton }
              }
              onClick={() => setActiveTab("income")}
            >
              Income
            </button>
            <button
              style={
                activeTab === "expenses"
                  ? {
                      ...styles.navButton,
                      ...styles.activeNavButton,
                      ...darkStyles.navButton,
                      ...darkStyles.activeNavButton,
                    }
                  : { ...styles.navButton, ...darkStyles.navButton }
              }
              onClick={() => setActiveTab("expenses")}
            >
              Expenses
            </button>
            <button
              style={
                activeTab === "split"
                  ? {
                      ...styles.navButton,
                      ...styles.activeNavButton,
                      ...darkStyles.navButton,
                      ...darkStyles.activeNavButton,
                    }
                  : { ...styles.navButton, ...darkStyles.navButton }
              }
              onClick={() => setActiveTab("split")}
            >
              Split Expenses
            </button>
            <button
              style={
                activeTab === "add"
                  ? {
                      ...styles.navButton,
                      ...styles.activeNavButton,
                      ...darkStyles.navButton,
                      ...darkStyles.activeNavButton,
                    }
                  : { ...styles.navButton, ...darkStyles.navButton }
              }
              onClick={() => setActiveTab("add")}
            >
              Add Transaction
            </button>
          </div>
        </div>

        <div style={{ ...styles.content, ...darkStyles.content }}>
          {isLoading ? (
            <div style={styles.loadingContainer}>
              <div
                style={{
                  ...styles.loadingSpinner,
                  borderColor: darkMode ? "#374151" : "#f3f3f3",
                  borderTopColor: darkMode ? "#60a5fa" : "#1976d2",
                }}
              ></div>
              <p style={darkMode ? { color: "#e5e7eb" } : {}}>Loading your financial data...</p>
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <div style={styles.overviewSection}>
                  <div style={styles.summaryCards}>
                    <div
                      style={{
                        ...styles.summaryCard,
                        backgroundColor: darkMode ? "#374151" : "#e3f2fd",
                        boxShadow: darkMode ? "0 2px 8px rgba(0, 0, 0, 0.2)" : "0 2px 8px rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      <h3 style={{ ...styles.cardTitle, color: darkMode ? "#9ca3af" : "#666" }}>Total Income</h3>
                      <p style={{ ...styles.cardAmount, color: darkMode ? "#60a5fa" : "#1976d2" }}>
                        ${totalIncome.toFixed(2)}
                      </p>
                    </div>
                    <div
                      style={{
                        ...styles.summaryCard,
                        backgroundColor: darkMode ? "#374151" : "#ffebee",
                        boxShadow: darkMode ? "0 2px 8px rgba(0, 0, 0, 0.2)" : "0 2px 8px rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      <h3 style={{ ...styles.cardTitle, color: darkMode ? "#9ca3af" : "#666" }}>Total Expenses</h3>
                      <p style={{ ...styles.cardAmount, color: darkMode ? "#ef4444" : "#c62828" }}>
                        ${totalExpenses.toFixed(2)}
                      </p>
                    </div>
                    <div
                      style={{
                        ...styles.summaryCard,
                        backgroundColor: darkMode ? "#374151" : balance >= 0 ? "#e8f5e9" : "#ffebee",
                        boxShadow: darkMode ? "0 2px 8px rgba(0, 0, 0, 0.2)" : "0 2px 8px rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      <h3 style={{ ...styles.cardTitle, color: darkMode ? "#9ca3af" : "#666" }}>Balance</h3>
                      <p
                        style={{
                          ...styles.cardAmount,
                          color: balance >= 0 ? (darkMode ? "#34d399" : "#2e7d32") : darkMode ? "#ef4444" : "#c62828",
                        }}
                      >
                        ${balance.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div style={styles.charts}>
                    {chartData.expensesByCategory && (
                      <div style={{ ...styles.chartCard, ...darkStyles.chartCard }}>
                        <h2 style={{ ...styles.chartTitle, ...darkStyles.chartTitle }}>Expenses by Category</h2>
                        <div style={styles.chartContainer}>
                          <Pie
                            data={chartData.expensesByCategory}
                            options={{
                              plugins: {
                                legend: {
                                  position: "right",
                                  labels: {
                                    boxWidth: 15,
                                    padding: 15,
                                    font: {
                                      size: 12,
                                    },
                                    color: darkMode ? "#e5e7eb" : undefined,
                                  },
                                },
                              },
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {chartData.incomeVsExpenses && (
                      <div style={{ ...styles.chartCard, ...darkStyles.chartCard }}>
                        <h2 style={{ ...styles.chartTitle, ...darkStyles.chartTitle }}>Income vs Expenses</h2>
                        <div style={styles.chartContainer}>
                          <Bar
                            data={chartData.incomeVsExpenses}
                            options={{
                              plugins: {
                                legend: {
                                  display: false,
                                },
                              },
                              scales: {
                                y: {
                                  beginAtZero: true,
                                  ticks: {
                                    color: darkMode ? "#9ca3af" : undefined,
                                  },
                                  grid: {
                                    color: darkMode ? "#374151" : undefined,
                                  },
                                },
                                x: {
                                  ticks: {
                                    color: darkMode ? "#9ca3af" : undefined,
                                  },
                                  grid: {
                                    color: darkMode ? "#374151" : undefined,
                                  },
                                },
                              },
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "income" && (
                <div style={styles.tableSection}>
                  <div style={styles.tableHeader}>
                    <h2 style={{ ...styles.sectionTitle, ...darkStyles.sectionTitle }}>Income Transactions</h2>
                    <p style={{ ...styles.tableCount, ...darkStyles.tableCount }}>{income.length} entries</p>
                  </div>
                  {income.length > 0 ? (
                    <div style={{ ...styles.tableWrapper, ...darkStyles.tableWrapper }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Category</th>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Amount</th>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Date</th>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Description</th>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {income.map((entry) => (
                            <tr key={entry.id} style={{ ...styles.tr, ...darkStyles.tr }}>
                              {editingIncomeId === entry.id ? (
                                <>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <input
                                      type="text"
                                      name="category"
                                      value={editFormData.category}
                                      onChange={handleEditChange}
                                      style={{ ...styles.editInput, ...darkStyles.editInput }}
                                    />
                                  </td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <input
                                      type="number"
                                      name="amount"
                                      value={editFormData.amount}
                                      onChange={handleEditChange}
                                      style={{ ...styles.editInput, ...darkStyles.editInput }}
                                    />
                                  </td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <input
                                      type="date"
                                      name="date"
                                      value={editFormData.date}
                                      onChange={handleEditChange}
                                      style={{ ...styles.editInput, ...darkStyles.editInput }}
                                    />
                                  </td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <input
                                      type="text"
                                      name="description"
                                      value={editFormData.description}
                                      onChange={handleEditChange}
                                      style={{ ...styles.editInput, ...darkStyles.editInput }}
                                    />
                                  </td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <div style={styles.actionButtons}>
                                      <button
                                        style={styles.saveButton}
                                        onClick={() => handleEditSubmit(entry.id, "income")}
                                      >
                                        Save
                                      </button>
                                      <button style={styles.cancelButton} onClick={() => setEditingIncomeId(null)}>
                                        Cancel
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <span
                                      style={{
                                        ...styles.categoryBadge,
                                        backgroundColor: darkMode ? "#065f46" : "#e8f5e9",
                                        color: darkMode ? "#34d399" : "#2e7d32",
                                      }}
                                    >
                                      {entry.category || "Uncategorized"}
                                    </span>
                                  </td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <span
                                      style={{
                                        ...styles.amount,
                                        color: darkMode ? "#e5e7eb" : "#333",
                                      }}
                                    >
                                      ${Number.parseFloat(entry.amount).toFixed(2)}
                                    </span>
                                  </td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>{entry.date}</td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>{entry.description || "-"}</td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <div style={styles.actionButtons}>
                                      <button
                                        style={styles.editButton}
                                        onClick={() => handleEditStart(entry, "income")}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        style={styles.deleteButton}
                                        onClick={() => handleDelete(entry.id, "income")}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ ...styles.emptyState, ...darkStyles.emptyState }}>
                      <p>No income transactions found.</p>
                      <button style={styles.addButton} onClick={() => setActiveTab("add")}>
                        Add Income
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "expenses" && (
                <div style={styles.tableSection}>
                  <div style={styles.tableHeader}>
                    <h2 style={{ ...styles.sectionTitle, ...darkStyles.sectionTitle }}>Expense Transactions</h2>
                    <p style={{ ...styles.tableCount, ...darkStyles.tableCount }}>{expenses.length} entries</p>
                  </div>
                  {expenses.length > 0 ? (
                    <div style={{ ...styles.tableWrapper, ...darkStyles.tableWrapper }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Category</th>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Amount</th>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Date</th>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Description</th>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Receipt</th>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map((expense) => (
                            <tr key={expense.id} style={{ ...styles.tr, ...darkStyles.tr }}>
                              {editingExpenseId === expense.id ? (
                                <>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <input
                                      type="text"
                                      name="category"
                                      value={editFormData.category}
                                      onChange={handleEditChange}
                                      style={{ ...styles.editInput, ...darkStyles.editInput }}
                                    />
                                  </td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <input
                                      type="number"
                                      name="amount"
                                      value={editFormData.amount}
                                      onChange={handleEditChange}
                                      style={{ ...styles.editInput, ...darkStyles.editInput }}
                                    />
                                  </td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <input
                                      type="date"
                                      name="date"
                                      value={editFormData.date}
                                      onChange={handleEditChange}
                                      style={{ ...styles.editInput, ...darkStyles.editInput }}
                                    />
                                  </td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <input
                                      type="text"
                                      name="description"
                                      value={editFormData.description}
                                      onChange={handleEditChange}
                                      style={{ ...styles.editInput, ...darkStyles.editInput }}
                                    />
                                  </td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <input
                                      type="text"
                                      name="receipt_url"
                                      value={editFormData.receipt_url}
                                      onChange={handleEditChange}
                                      style={{ ...styles.editInput, ...darkStyles.editInput }}
                                      placeholder="Receipt URL"
                                    />
                                  </td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <div style={styles.actionButtons}>
                                      <button
                                        style={styles.saveButton}
                                        onClick={() => handleEditSubmit(expense.id, "expense")}
                                      >
                                        Save
                                      </button>
                                      <button style={styles.cancelButton} onClick={() => setEditingExpenseId(null)}>
                                        Cancel
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <span
                                      style={{
                                        ...styles.categoryBadge,
                                        backgroundColor: darkMode ? "#7f1d1d" : "#ffebee",
                                        color: darkMode ? "#fca5a5" : "#c62828",
                                      }}
                                    >
                                      {expense.category || "Uncategorized"}
                                    </span>
                                  </td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <span
                                      style={{
                                        ...styles.amount,
                                        color: darkMode ? "#ef4444" : "#c62828",
                                      }}
                                    >
                                      ${Number.parseFloat(expense.amount).toFixed(2)}
                                    </span>
                                  </td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>{expense.date}</td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>{expense.description || "-"}</td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    {expense.receipt_url ? (
                                      <a
                                        href={expense.receipt_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          ...styles.receiptLink,
                                          color: darkMode ? "#60a5fa" : "#1976d2",
                                        }}
                                      >
                                        View Receipt
                                      </a>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                  <td style={{ ...styles.td, ...darkStyles.td }}>
                                    <div style={styles.actionButtons}>
                                      <button
                                        style={styles.editButton}
                                        onClick={() => handleEditStart(expense, "expense")}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        style={styles.deleteButton}
                                        onClick={() => handleDelete(expense.id, "expense")}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ ...styles.emptyState, ...darkStyles.emptyState }}>
                      <p>No expense transactions found.</p>
                      <button style={styles.addButton} onClick={() => setActiveTab("add")}>
                        Add Expense
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "split" && (
                <div style={styles.tableSection}>
                  <div style={styles.tableHeader}>
                    <h2 style={{ ...styles.sectionTitle, ...darkStyles.sectionTitle }}>Split Expenses</h2>
                    <p style={{ ...styles.tableCount, ...darkStyles.tableCount }}>{splitExpenses.length} entries</p>
                  </div>
                  {splitExpenses.length > 0 ? (
                    <div style={{ ...styles.tableWrapper, ...darkStyles.tableWrapper }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Category</th>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Total Amount</th>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Split With</th>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Amount Owed</th>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Date</th>
                            <th style={{ ...styles.th, ...darkStyles.th }}>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {splitExpenses.map((split) => (
                            <tr key={split.id} style={{ ...styles.tr, ...darkStyles.tr }}>
                              <td style={{ ...styles.td, ...darkStyles.td }}>
                                <span
                                  style={{
                                    ...styles.categoryBadge,
                                    backgroundColor: darkMode ? "#1e3a8a" : "#e8eaf6",
                                    color: darkMode ? "#93c5fd" : "#3949ab",
                                  }}
                                >
                                  {split.category || "Uncategorized"}
                                </span>
                              </td>
                              <td style={{ ...styles.td, ...darkStyles.td }}>
                                <span
                                  style={{
                                    ...styles.amount,
                                    color: darkMode ? "#e5e7eb" : "inherit",
                                  }}
                                >
                                  ${Number.parseFloat(split.total_amount).toFixed(2)}
                                </span>
                              </td>
                              <td style={{ ...styles.td, ...darkStyles.td }}>
                                <span
                                  style={{
                                    ...styles.splitWithEmail,
                                    color: darkMode ? "#9ca3af" : "#666",
                                  }}
                                >
                                  {split.split_with_email}
                                </span>
                              </td>
                              <td style={{ ...styles.td, ...darkStyles.td }}>
                                <span
                                  style={{
                                    ...styles.amount,
                                    color: darkMode ? "#93c5fd" : "#3949ab",
                                  }}
                                >
                                  ${Number.parseFloat(split.amount_owed).toFixed(2)}
                                </span>
                              </td>
                              <td style={{ ...styles.td, ...darkStyles.td }}>{split.date}</td>
                              <td style={{ ...styles.td, ...darkStyles.td }}>{split.description || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ ...styles.emptyState, ...darkStyles.emptyState }}>
                      <p>No split expenses found.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "add" && (
                <div style={styles.formSection}>
                  <h2 style={{ ...styles.sectionTitle, ...darkStyles.sectionTitle }}>Add New Transaction</h2>
                  <div style={styles.formCards}>
                    <div style={{ ...styles.formCard, ...darkStyles.formCard }}>
                      <h3 style={{ ...styles.formCardTitle, ...darkStyles.formCardTitle }}>Add Income</h3>
                      <IncomeForm onTransactionAdded={fetchData} darkMode={darkMode} />
                    </div>
                    <div style={{ ...styles.formCard, ...darkStyles.formCard }}>
                      <h3 style={{ ...styles.formCardTitle, ...darkStyles.formCardTitle }}>Add Expense</h3>
                      <ExpenseForm onTransactionAdded={fetchData} darkMode={darkMode} />
                    </div>
                    <div style={{ ...styles.formCard, ...darkStyles.formCard }}>
                      <h3 style={{ ...styles.formCardTitle, ...darkStyles.formCardTitle }}>Set Budget</h3>
                      <BudgetForm darkMode={darkMode} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    backgroundColor: "#f5f7fa",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
    padding: "15px 30px",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: "1400px",
    margin: "0 auto",
    width: "100%",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#333",
    margin: 0,
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },
  userEmail: {
    fontSize: "14px",
    color: "#666",
  },
  userActions: {
    display: "flex",
    gap: "10px",
  },
  accountButton: {
    padding: "8px 16px",
    backgroundColor: "#f0f2f5",
    color: "#333",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  logoutButton: {
    padding: "8px 16px",
    backgroundColor: "#ffebee",
    color: "#c62828",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  mainContent: {
    display: "flex",
    flex: 1,
    maxWidth: "1400px",
    margin: "0 auto",
    width: "100%",
    padding: "20px",
    gap: "20px",
  },
  sidebar: {
    width: "250px",
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "10px",
  },
  avatar: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "bold",
  },
  userDetails: {
    display: "flex",
    flexDirection: "column",
  },
  welcomeText: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#333",
    margin: "0 0 5px 0",
  },
  navigation: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  navButton: {
    padding: "12px 15px",
    textAlign: "left",
    backgroundColor: "transparent",
    color: "#666",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  activeNavButton: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
    padding: "25px",
    overflowY: "auto",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "300px",
    gap: "20px",
  },
  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #f3f3f3",
    borderTop: "4px solid #1976d2",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    "@keyframes spin": {
      "0%": { transform: "rotate(0deg)" },
      "100%": { transform: "rotate(360deg)" },
    },
  },
  overviewSection: {
    display: "flex",
    flexDirection: "column",
    gap: "30px",
  },
  summaryCards: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
  },
  summaryCard: {
    flex: "1 1 250px",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
  },
  cardTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#666",
    margin: "0 0 10px 0",
  },
  cardAmount: {
    fontSize: "28px",
    fontWeight: "700",
    margin: 0,
  },
  charts: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
    marginTop: "10px",
  },
  chartCard: {
    flex: "1 1 400px",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
    backgroundColor: "#ffffff",
  },
  chartTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#333",
    margin: "0 0 20px 0",
  },
  chartContainer: {
    height: "300px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tableSection: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#333",
    margin: 0,
  },
  tableCount: {
    fontSize: "14px",
    color: "#666",
    margin: 0,
  },
  tableWrapper: {
    overflowX: "auto",
    borderRadius: "8px",
    border: "1px solid #eee",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  th: {
    padding: "12px 15px",
    textAlign: "left",
    backgroundColor: "#f8f9fa",
    color: "#666",
    fontWeight: "600",
    borderBottom: "1px solid #eee",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #eee",
    transition: "background-color 0.2s",
  },
  td: {
    padding: "12px 15px",
    color: "#333",
  },
  categoryBadge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
    fontSize: "12px",
    fontWeight: "500",
  },
  amount: {
    fontWeight: "600",
    color: "#333",
  },
  splitWithEmail: {
    fontSize: "13px",
    color: "#666",
  },
  receiptLink: {
    color: "#1976d2",
    textDecoration: "none",
    fontWeight: "500",
  },
  actionButtons: {
    display: "flex",
    gap: "8px",
  },
  editButton: {
    padding: "6px 12px",
    backgroundColor: "#fff9c4",
    color: "#f57f17",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  deleteButton: {
    padding: "6px 12px",
    backgroundColor: "#ffebee",
    color: "#c62828",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  saveButton: {
    padding: "6px 12px",
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  cancelButton: {
    padding: "6px 12px",
    backgroundColor: "#f5f5f5",
    color: "#757575",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  editInput: {
    width: "100%",
    padding: "8px 10px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    backgroundColor: "#fff",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    gap: "15px",
    color: "#666",
  },
  addButton: {
    padding: "8px 16px",
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  formSection: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  formCards: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
  },
  formCard: {
    flex: "1 1 300px",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
    backgroundColor: "#ffffff",
  },
  formCardTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#333",
    margin: "0 0 20px 0",
  },
}

export default Dashboard

