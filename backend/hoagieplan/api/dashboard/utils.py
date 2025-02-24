import time


def cumulative_time(func):
    def wrapper(*args, **kwargs):
        if not hasattr(wrapper, "total_time"):
            wrapper.total_time = 0
        start_time = time.perf_counter()
        result = func(*args, **kwargs)
        end_time = time.perf_counter()
        wrapper.total_time += end_time - start_time
        return result

    wrapper.total_time = 0
    return wrapper
