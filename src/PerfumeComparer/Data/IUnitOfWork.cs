using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore.Storage;

namespace PerfumeComparer.Data;

public interface IUnitOfWork : IDisposable
{
    IRepository<T> GetRepository<T>() where T : class;
    IQueryable<TQuery> SqlQuery<TQuery>(FormattableString sql);
    IDbContextTransaction Begin();
    void Commit();
    void Commit(IDbContextTransaction transaction, bool dispose = false);
    void Rollback();
    void Rollback(IDbContextTransaction transaction, bool dispose = false);
    int SaveChanges();
    Task<int> SaveChangesAsync();
}
