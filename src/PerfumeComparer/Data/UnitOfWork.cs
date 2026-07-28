using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using PerfumeComparer.Data.Persistence;

namespace PerfumeComparer.Data;

public class UnitOfWork(AppDbContext context) : IUnitOfWork
{
    private readonly ConcurrentDictionary<Type, object> _repositories = new();
    private bool _disposed;

    public IRepository<T> GetRepository<T>() where T : class
    {
        return (IRepository<T>)_repositories.GetOrAdd(typeof(T), _ => new Repository<T>(context));
    }

    public IQueryable<TQuery> SqlQuery<TQuery>(FormattableString sql)
    {
        return context.Database.SqlQuery<TQuery>(sql);
    }

    public IDbContextTransaction Begin()
    {
        return context.Database.BeginTransaction();
    }

    public void Commit()
    {
        context.Database.CurrentTransaction?.Commit();
    }

    public void Commit(IDbContextTransaction transaction, bool dispose = false)
    {
        ArgumentNullException.ThrowIfNull(transaction);
        transaction.Commit();
        if (dispose)
        {
            transaction.Dispose();
        }
    }

    public void Rollback()
    {
        context.Database.CurrentTransaction?.Rollback();
    }

    public void Rollback(IDbContextTransaction transaction, bool dispose = false)
    {
        ArgumentNullException.ThrowIfNull(transaction);
        transaction.Rollback();
        if (dispose)
        {
            transaction.Dispose();
        }
    }

    public int SaveChanges()
    {
        return context.SaveChanges();
    }

    public Task<int> SaveChangesAsync()
    {
        return context.SaveChangesAsync();
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                context.Dispose();
            }
            _disposed = true;
        }
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }
}
