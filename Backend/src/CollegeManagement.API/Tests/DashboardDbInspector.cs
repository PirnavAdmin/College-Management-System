using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using MySqlConnector;

namespace CollegeManagement.API.Tests;

public class DashboardDbInspector
{
    private readonly string _connectionString;

    public DashboardDbInspector(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task InspectAsync()
    {
        Console.WriteLine("================================================================================");
        Console.WriteLine("          DEEP DATABASE SEARCH FOR CERTIFICATES & DATA");
        Console.WriteLine("================================================================================");

        using var conn = new MySqlConnection(_connectionString);
        await conn.OpenAsync();
        var dbName = await conn.ExecuteScalarAsync<string>("SELECT DATABASE();");
        Console.WriteLine($"Database: {dbName}\n");

        var allTables = (await conn.QueryAsync<string>("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE();")).ToList();
        Console.WriteLine($"Total tables in database: {allTables.Count}");
        Console.WriteLine("Tables: " + string.Join(", ", allTables));

        // Search for any table containing certificate records
        Console.WriteLine("\n--- SEARCHING FOR CERTIFICATE RECORDS ---");
        foreach (var tbl in allTables)
        {
            try
            {
                var cols = (await conn.QueryAsync<string>($"SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = '{tbl}';")).ToList();
                if (cols.Any(c => c.Contains("cert", StringComparison.OrdinalIgnoreCase) || c.Contains("certificate", StringComparison.OrdinalIgnoreCase) || c.Contains("type", StringComparison.OrdinalIgnoreCase)))
                {
                    var count = await conn.ExecuteScalarAsync<int>($"SELECT COUNT(*) FROM `{tbl}`;");
                    Console.WriteLine($"Found Candidate Table: `{tbl}` | Columns: {string.Join(", ", cols)} | Row Count: {count}");
                    if (count > 0)
                    {
                        var rows = await conn.QueryAsync<dynamic>($"SELECT * FROM `{tbl}` LIMIT 10;");
                        foreach (IDictionary<string, object> r in rows)
                        {
                            Console.WriteLine("  Row: " + string.Join(" | ", r.Select(kv => $"{kv.Key}: {kv.Value}")));
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error querying table `{tbl}`: {ex.Message}");
            }
        }
    }
}
